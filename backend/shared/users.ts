import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { TERMS_VERSION } from '../../shared/constants/profile';
import type { ProfileResponse } from '../../shared/schemas/profile';
import { userRowSchema } from './schemas/user-row';
import type { UserRow } from './schemas/user-row';

/** A row read from the table, checked by its schema; a broken one names every wrong field. */
export function parseUserRow(item: unknown): UserRow {
  const result = userRowSchema.safeParse(item);
  if (!result.success) {
    const id =
      userRowSchema.pick({ user_id: true }).safeParse(item).data?.user_id ?? '(no user_id)';
    throw new Error(`The users row of ${id} is broken:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export async function readUserRow(
  db: DynamoDBDocumentClient,
  table: string,
  userId: string,
  consistent = false
): Promise<UserRow | undefined> {
  const { Item } = await db.send(
    new GetCommand({ TableName: table, Key: { user_id: userId }, ConsistentRead: consistent })
  );
  return Item === undefined ? undefined : parseUserRow(Item);
}

/** The answer body of `GET` and `PATCH /profile`; the photo goes out only if shown (D-21). */
export const buildProfileResponse = (user: UserRow): ProfileResponse => ({
  display_name: user.display_name ?? null,
  city: user.city ?? null,
  avatar_url: user.show_google_photo ? (user.avatar_url ?? null) : null,
  show_google_photo: user.show_google_photo,
  status: user.status,
  terms_accepted: user.terms_version === TERMS_VERSION,
});
