import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { STATUS_OK, STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { GOOGLE_IMAGE_HOST_SUFFIX } from '../../shared/constants/profile';
import type { ApiResult, ProfileEvent, UserRow } from './handler.types';

// GET /api/profile (D-59): the caller's profile. The first call after sign-in creates the `users`
// row from the token's claims. `user_id` is always the token's `sub`, never anything in the request.

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

/** The `picture` claim if it is an https address on Google's image host (D-21), else nothing. */
function googlePhoto(picture: string | undefined): string | undefined {
  try {
    const url = new URL(picture ?? '');
    return url.protocol === 'https:' && url.hostname.endsWith(GOOGLE_IMAGE_HOST_SUFFIX)
      ? picture
      : undefined;
  } catch {
    return undefined;
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

export async function handler(event: ProfileEvent): Promise<ApiResult> {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const userId = claims?.sub;
  // The authorizer also accepts access tokens, but only the ID token carries the Google photo.
  if (claims?.token_use !== 'id' || !userId) {
    return reply(STATUS_UNAUTHORIZED, { code: 'UNAUTHORIZED' });
  }

  const photo = googlePhoto(claims.picture);
  let user = await readUser(userId);
  if (!user) {
    user = await createUser(userId, photo);
  } else if (photo && photo !== user.avatar_url) {
    await db.send(
      new UpdateCommand({
        TableName: usersTable(),
        Key: { user_id: userId },
        UpdateExpression: 'SET avatar_url = :photo',
        ExpressionAttributeValues: { ':photo': photo },
      })
    );
    user = { ...user, avatar_url: photo };
  }

  // A banned member still gets the profile, so the app can say so (API.md). The Google photo goes
  // out only when the member chose to show it (D-21); the stored copy stays either way.
  return reply(STATUS_OK, {
    display_name: user.display_name ?? null,
    city: user.city ?? null,
    avatar_url: user.show_google_photo ? (user.avatar_url ?? null) : null,
    show_google_photo: user.show_google_photo,
    status: user.status,
  });
}
