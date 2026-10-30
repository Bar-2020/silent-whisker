import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { STATUS_OK, STATUS_UNAUTHORIZED } from '../../shared/constants/http';
import { GOOGLE_IMAGE_HOST_SUFFIX } from '../../shared/constants/profile';
import { refuse, reply, verifiedClaims } from '../shared/api';
import type { ApiEvent, ApiResult } from '../shared/api.types';
import { readSettings } from '../shared/env';
import { getProfileSettings } from '../shared/schemas/settings.schema';
import type { UserRow } from '../shared/schemas/user-row.schema';
import { buildProfileResponse, readUserRow } from '../shared/users';
import type { Member } from './handler.types';

// GET /api/profile (D-59): `user_id` is always the token's `sub`, never anything in the request.

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Only an https address on Google's image host is kept (D-21). */
function checkIfGooglePhoto(picture: string | undefined): boolean {
  try {
    const url = new URL(picture ?? '');
    return url.protocol === 'https:' && url.hostname.endsWith(GOOGLE_IMAGE_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** A conditional write, so two first calls at once make one row: the loser reads the winner's. */
async function createUser(
  table: string,
  userId: string,
  photo: string | undefined
): Promise<UserRow> {
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
        TableName: table,
        Item: row,
        ConditionExpression: 'attribute_not_exists(user_id)',
      })
    );
    return row;
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) throw error;
    const winner = await readUserRow(db, table, userId, true);
    if (!winner) throw error;
    return winner;
  }
}

function memberFrom(event: ApiEvent): Member | undefined {
  const claims = verifiedClaims(event);
  if (!claims) return undefined;
  const photo = checkIfGooglePhoto(claims.picture) ? claims.picture : undefined;
  return { userId: claims.sub, photo };
}

async function loadUser(table: string, { userId, photo }: Member): Promise<UserRow> {
  const user = await readUserRow(db, table, userId);
  if (!user) return createUser(table, userId, photo);
  if (!photo || photo === user.avatar_url) return user;
  await db.send(
    new UpdateCommand({
      TableName: table,
      Key: { user_id: userId },
      UpdateExpression: 'SET avatar_url = :photo',
      ExpressionAttributeValues: { ':photo': photo },
    })
  );
  return { ...user, avatar_url: photo };
}

export async function handler(event: ApiEvent): Promise<ApiResult> {
  const member = memberFrom(event);
  if (!member) return refuse(STATUS_UNAUTHORIZED, 'UNAUTHORIZED');
  const { USERS_TABLE } = readSettings(getProfileSettings);
  // A banned member still gets the profile (API.md).
  return reply(STATUS_OK, buildProfileResponse(await loadUser(USERS_TABLE, member)));
}
