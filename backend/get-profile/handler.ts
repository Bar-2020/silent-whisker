import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { STATUS_OK, STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { GOOGLE_IMAGE_HOST_SUFFIX, TERMS_VERSION } from '../../shared/constants/profile';
import type { ApiResult, Member, ProfileEvent, UserRow } from './handler.types';

// GET /api/profile (D-59): `user_id` is always the token's `sub`, never anything in the request.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const reply = (statusCode: number, body: unknown): ApiResult => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

function usersTable(): string {
  const name = process.env.USERS_TABLE;
  if (!name) throw new Error('USERS_TABLE is not set');
  return name;
}

/** Only an https address on Google's image host is kept (D-21). */
function checkIfGooglePhoto(picture: string | undefined): boolean {
  try {
    const url = new URL(picture ?? '');
    return url.protocol === 'https:' && url.hostname.endsWith(GOOGLE_IMAGE_HOST_SUFFIX);
  } catch {
    return false;
  }
}

async function readUser(userId: string, consistent = false): Promise<UserRow | undefined> {
  const { Item } = await db.send(
    new GetCommand({
      TableName: usersTable(),
      Key: { user_id: userId },
      ConsistentRead: consistent,
    })
  );
  return Item as UserRow | undefined;
}

/** A conditional write, so two first calls at once make one row: the loser reads the winner's. */
async function createUser(userId: string, photo: string | undefined): Promise<UserRow> {
  const row: UserRow = {
    user_id: userId,
    status: 'active',
    show_google_photo: false,
    is_admin: false,
    cats_helped: 0,
    feedings: 0,
    waters: 0,
    created_at: new Date().toISOString(),
    ...(photo ? { avatar_url: photo } : {}),
  };
  try {
    await db.send(
      new PutCommand({
        TableName: usersTable(),
        Item: row,
        ConditionExpression: 'attribute_not_exists(user_id)',
      })
    );
    return row;
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    const winner = await readUser(userId, true);
    if (!winner) throw error;
    return winner;
  }
}

function memberFrom(event: ProfileEvent): Member | undefined {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  // The authorizer also accepts access tokens, but only the ID token carries the Google photo.
  if (claims?.token_use !== 'id' || !claims.sub) return undefined;
  const photo = checkIfGooglePhoto(claims.picture) ? claims.picture : undefined;
  return { userId: claims.sub, photo };
}

async function loadUser({ userId, photo }: Member): Promise<UserRow> {
  const user = await readUser(userId);
  if (!user) return createUser(userId, photo);
  if (!photo || photo === user.avatar_url) return user;
  await db.send(
    new UpdateCommand({
      TableName: usersTable(),
      Key: { user_id: userId },
      UpdateExpression: 'SET avatar_url = :photo',
      ExpressionAttributeValues: { ':photo': photo },
    })
  );
  return { ...user, avatar_url: photo };
}

/** The photo goes out only if the member chose to show it (D-21). */
const profileOf = (user: UserRow) => ({
  display_name: user.display_name ?? null,
  city: user.city ?? null,
  avatar_url: user.show_google_photo ? (user.avatar_url ?? null) : null,
  show_google_photo: user.show_google_photo,
  status: user.status,
  terms_accepted: user.terms_version === TERMS_VERSION,
});

export async function handler(event: ProfileEvent): Promise<ApiResult> {
  const member = memberFrom(event);
  if (!member) return reply(STATUS_UNAUTHORIZED, { code: 'UNAUTHORIZED' });
  // A banned member still gets the profile (API.md).
  return reply(STATUS_OK, profileOf(await loadUser(member)));
}
