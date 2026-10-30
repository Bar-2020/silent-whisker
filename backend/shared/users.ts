import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TERMS_VERSION } from '../../shared/constants/profile';
import type { Profile, UserRow } from './users.types';

type FieldKind = 'string' | 'number' | 'boolean';

const REQUIRED_FIELDS: Record<string, FieldKind> = {
  user_id: 'string',
  show_google_photo: 'boolean',
  is_admin: 'boolean',
  cats_helped: 'number',
  feedings: 'number',
  waters: 'number',
  created_at: 'string',
};

const OPTIONAL_FIELDS: Record<string, FieldKind> = {
  avatar_url: 'string',
  display_name: 'string',
  city: 'string',
  city_lat: 'number',
  city_lng: 'number',
  terms_accepted_at: 'string',
  terms_version: 'number',
};

const typeOfField = (item: object, name: string): string => typeof Reflect.get(item, name);

/** Names every wrong field at once, so a broken row is fixed from the message alone. */
function assertUserRow(item: object): asserts item is UserRow {
  const wrong = [
    ...Object.entries(REQUIRED_FIELDS).filter(([name, kind]) => typeOfField(item, name) !== kind),
    ...Object.entries(OPTIONAL_FIELDS).filter(
      ([name, kind]) => !['undefined', kind].includes(typeOfField(item, name))
    ),
  ].map(([name, kind]) => `"${name}" should be a ${kind}, not ${typeOfField(item, name)}`);
  const status: unknown = Reflect.get(item, 'status');
  if (status !== 'active' && status !== 'banned') wrong.push('"status" should be active or banned');
  if (wrong.length > 0) {
    const id = String(Reflect.get(item, 'user_id'));
    throw new Error(`The users row of ${id} is broken: ${wrong.join('; ')}`);
  }
}

/** A row read from the table, checked field by field instead of trusted. */
export function parseUserRow(item: object): UserRow {
  assertUserRow(item);
  return item;
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
export const buildProfileResponse = (user: UserRow): Profile => ({
  display_name: user.display_name ?? null,
  city: user.city ?? null,
  avatar_url: user.show_google_photo ? (user.avatar_url ?? null) : null,
  show_google_photo: user.show_google_photo,
  status: user.status,
  terms_accepted: user.terms_version === TERMS_VERSION,
});
