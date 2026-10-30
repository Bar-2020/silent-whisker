import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TERMS_VERSION } from '../../shared/constants/profile';
import type { Profile, UserRow } from './users.types';

export async function readUser(
  db: DynamoDBDocumentClient,
  table: string,
  userId: string,
  consistent = false
): Promise<UserRow | undefined> {
  const { Item } = await db.send(
    new GetCommand({ TableName: table, Key: { user_id: userId }, ConsistentRead: consistent })
  );
  return Item as UserRow | undefined;
}

/** The photo goes out only if the member chose to show it (D-21). */
export const profileOf = (user: UserRow): Profile => ({
  display_name: user.display_name ?? null,
  city: user.city ?? null,
  avatar_url: user.show_google_photo ? (user.avatar_url ?? null) : null,
  show_google_photo: user.show_google_photo,
  status: user.status,
  terms_accepted: user.terms_version === TERMS_VERSION,
});
