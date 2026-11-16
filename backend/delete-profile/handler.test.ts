import {
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { DELETED_ACCOUNT_KEY_PREFIX, ID_TOKEN_LIFE_SECONDS } from '../../shared/constants/account';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import { TERMS_VERSION } from '../../shared/constants/profile';
import type { ApiEvent } from '../shared/api.types';
import type { UserRow } from '../shared/schemas/user-row.schema';
import { handler as getProfile } from '../get-profile/handler';
import { handler } from './handler';

const dbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

const USERS = 'users';
const COUNTERS = 'daily_usage_counters';
const POOL = 'eu-north-1_pool';
const NOW = new Date('2026-11-15T12:00:00Z');
const DAY = '2026-11-15';
const MS_PER_SECOND = 1000;
const NOW_SECONDS = Math.floor(NOW.getTime() / MS_PER_SECOND);

const MEMBER = { sub: 'user-1', token_use: 'id', 'cognito:username': 'Google_1001' };
const OTHER_MEMBER = { sub: 'user-2', token_use: 'id', 'cognito:username': 'Google_1002' };
const TOKEN_WITHOUT_USERNAME = { sub: 'user-1', token_use: 'id' };
const WRITE_BUDGET = `write_budget#user-1#${DAY}`;
const MARKER = `${DELETED_ACCOUNT_KEY_PREFIX}user-1`;
const STUB = { user_id: 'user-1', status: 'banned' };

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

const eventAs = (claims: Record<string, string>, body?: unknown): ApiEvent => ({
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  requestContext: { authorizer: { jwt: { claims } } },
});

const confirm = (value: boolean, claims: Record<string, string> = MEMBER) =>
  eventAs(claims, { confirm: value });

/** Every attribute a member's row can hold (user-row.schema.ts), in Hebrew where it is text. */
const FULL_ROW: UserRow = {
  user_id: 'user-1',
  status: 'active',
  show_google_photo: true,
  is_admin: false,
  cats_helped: 3,
  feedings: 5,
  waters: 2,
  created_at: '2026-10-01T08:00:00.000Z',
  avatar_url: 'https://lh3.googleusercontent.com/a/photo=s96-c',
  display_name: 'דנה לוי',
  city: 'חיפה',
  city_lat: 32.79,
  city_lng: 34.99,
  terms_accepted_at: '2026-10-01T08:00:00.000Z',
  terms_version: TERMS_VERSION,
  chat_restricted_until: '2026-12-01T00:00:00.000Z',
};
const BANNED_ROW: UserRow = { ...FULL_ROW, status: 'banned' };
const NEW_ROW: UserRow = {
  user_id: 'user-1',
  status: 'active',
  show_google_photo: false,
  is_admin: false,
  cats_helped: 0,
  feedings: 0,
  waters: 0,
  created_at: '2026-11-15T11:00:00.000Z',
};

type Item = Record<string, unknown>;
interface WriteInput {
  Key?: Record<string, string>;
  UpdateExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
}

// The tables as the real ones answer: conditions are checked, so a refused write changes nothing.
const users = new Map<string, Item>();
const counters = new Map<string, number>();
const markers = new Map<string, unknown[]>();
/** Which call came when, across both clients: the order D-109 fixes. */
let order: string[] = [];
let afterRead: (() => void) | undefined;
let cognitoError: Error | undefined;

const keyOf = (input: WriteInput): string => Object.values(input.Key ?? {})[0] ?? '';

const removedBy = (input: WriteInput): string[] => {
  const [, list = ''] = (input.UpdateExpression ?? '').split('REMOVE');
  return list
    .split(',')
    .map((token) => token.trim())
    .map((token) => input.ExpressionAttributeNames?.[token] ?? token);
};

function fakeDatabase(): void {
  dbMock.on(GetCommand, { TableName: USERS }).callsFake((input: WriteInput) => {
    order.push('read');
    const item = users.get(keyOf(input));
    afterRead?.();
    return { Item: item && structuredClone(item) };
  });
  dbMock.on(GetCommand, { TableName: COUNTERS }).callsFake((input: WriteInput) => {
    const key = keyOf(input);
    return { Item: markers.has(key) ? { key } : undefined };
  });
  dbMock.on(PutCommand, { TableName: USERS }).callsFake((input: { Item: Item }) => {
    order.push('put');
    const id = String(input.Item.user_id);
    if (users.has(id)) throw conditionFailed();
    users.set(id, structuredClone(input.Item));
    return {};
  });
  dbMock.on(DeleteCommand, { TableName: USERS }).callsFake((input: WriteInput) => {
    order.push('delete');
    const id = keyOf(input);
    if (users.get(id)?.status === 'banned') throw conditionFailed();
    users.delete(id);
    return {};
  });
  dbMock.on(UpdateCommand, { TableName: USERS }).callsFake((input: WriteInput) => {
    const id = keyOf(input);
    if (!input.UpdateExpression?.includes('REMOVE')) {
      order.push('user-update');
      return {};
    }
    order.push('ban');
    const row = users.get(id);
    if (row?.status !== 'banned') throw conditionFailed();
    for (const name of removedBy(input)) Reflect.deleteProperty(row, name);
    return {};
  });
  dbMock.on(UpdateCommand, { TableName: COUNTERS }).callsFake((input: WriteInput) => {
    const key = keyOf(input);
    const values = input.ExpressionAttributeValues ?? {};
    if (key.startsWith(DELETED_ACCOUNT_KEY_PREFIX)) {
      order.push('marker');
      markers.set(key, Object.values(values));
      return {};
    }
    if (!key.startsWith('write_budget#')) throw new Error(`unexpected counter ${key}`);
    const current = counters.get(key) ?? 0;
    const back = values[':back'];
    if (typeof back === 'number') {
      order.push('give-back');
      counters.set(key, current + back);
      return {};
    }
    order.push('limit');
    if (current >= WRITES_PER_DAY) throw conditionFailed();
    counters.set(key, current + 1);
    return {};
  });
  const cognito = (label: string) => () => {
    order.push(label);
    if (cognitoError) throw cognitoError;
    return {};
  };
  cognitoMock.on(AdminDeleteUserCommand).callsFake(cognito('cognito-delete'));
  cognitoMock.on(AdminDisableUserCommand).callsFake(cognito('cognito-disable'));
}

beforeEach(() => {
  users.clear();
  counters.clear();
  markers.clear();
  order = [];
  afterRead = undefined;
  cognitoError = undefined;
  dbMock.reset();
  cognitoMock.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  process.env.USERS_TABLE = USERS;
  process.env.COUNTERS_TABLE = COUNTERS;
  process.env.USER_POOL_ID = POOL;
  fakeDatabase();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const bodyOf = (result: { body: string }): unknown => JSON.parse(result.body);
const snapshot = (): Record<string, Item> => structuredClone(Object.fromEntries(users));
const cognitoCalls = () => cognitoMock.calls();
const nothingWritten = () => {
  expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  expect(dbMock.commandCalls(DeleteCommand)).toHaveLength(0);
  expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
  expect(cognitoCalls()).toHaveLength(0);
  expect(counters.size).toBe(0);
  expect(markers.size).toBe(0);
};
const asProfileCall = (claims: Record<string, string>): ApiEvent => eventAs(claims);

describe('DELETE /api/profile only accepts a member (AUTH-01, AUTH-02, R-22)', () => {
  it.each([
    ['no verified claims', { requestContext: {}, body: '{"confirm":true}' }],
    ['an access token', confirm(true, { ...MEMBER, token_use: 'access' })],
    ['claims with no subject', confirm(true, { token_use: 'id', 'cognito:username': 'Google_1' })],
  ])('refuses %s with 401 UNAUTHORIZED and touches nothing', async (_name, event) => {
    // AUTH-01, AUTH-02, R-22
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    expect(dbMock.calls()).toHaveLength(0);
    expect(cognitoCalls()).toHaveLength(0);
    expect(users.get('user-1')).toEqual(FULL_ROW);
  });
});

describe('DELETE /api/profile with confirm true deletes an active member (PROF-12, D-71, R-07, D-109)', () => {
  it('deletes the row, then the Cognito user, then writes the marker, and answers deleted true', async () => {
    // PROF-12, D-71, R-07, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.has('user-1')).toBe(false);
    expect(order).toEqual(['limit', 'read', 'delete', 'cognito-delete', 'marker']);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)[0].args[0].input).toEqual({
      UserPoolId: POOL,
      Username: 'Google_1001',
    });
    expect(cognitoMock.commandCalls(AdminDisableUserCommand)).toHaveLength(0);
  });

  it('reads the row with a consistent read and deletes only that member, on a condition', async () => {
    // PROF-12, D-71, D-109
    users.set('user-1', { ...FULL_ROW });
    users.set('user-2', { ...FULL_ROW, user_id: 'user-2' });

    await handler(confirm(true));

    const [read] = dbMock.commandCalls(GetCommand, { TableName: USERS });
    expect(read.args[0].input.ConsistentRead).toBe(true);
    const [deletion] = dbMock.commandCalls(DeleteCommand);
    expect(deletion.args[0].input.TableName).toBe(USERS);
    expect(deletion.args[0].input.Key).toEqual({ user_id: 'user-1' });
    expect(deletion.args[0].input.ConditionExpression).toBeDefined();
    expect(users.get('user-2')).toEqual({ ...FULL_ROW, user_id: 'user-2' });
  });

  it('takes one unit of the daily write budget of that member only (R-21)', async () => {
    // PROF-12, R-21, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    expect(counters.get(WRITE_BUDGET)).toBe(1);
    expect(counters.size).toBe(1);
  });

  it('works for a member who has not accepted the terms yet (PROF-13, R-36)', async () => {
    // PROF-13, R-36
    users.set('user-1', { ...NEW_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.has('user-1')).toBe(false);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
    expect(markers.has(MARKER)).toBe(true);
  });
});

describe('DELETE /api/profile with confirm true for a banned member keeps the ban (AUTH-06, D-71, R-08, D-109)', () => {
  it('reduces the row to user_id and status, disables the Cognito user and never deletes it', async () => {
    // AUTH-06, D-71, R-08, D-109
    users.set('user-1', { ...BANNED_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(STUB);
    expect(cognitoMock.commandCalls(AdminDisableUserCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminDisableUserCommand)[0].args[0].input).toEqual({
      UserPoolId: POOL,
      Username: 'Google_1001',
    });
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
    // A delete the row refuses may come first; what D-109 fixes is row, then Cognito, then marker.
    expect(order.filter((step) => step !== 'delete')).toEqual([
      'limit',
      'read',
      'ban',
      'cognito-disable',
      'marker',
    ]);
  });

  it('removes the row attributes by an update that cannot make a row, and sets nothing', async () => {
    // AUTH-06, D-71, D-109
    users.set('user-1', { ...BANNED_ROW });

    await handler(confirm(true));

    const updates = dbMock.commandCalls(UpdateCommand, { TableName: USERS });
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.Key).toEqual({ user_id: 'user-1' });
    expect(updates[0].args[0].input.ConditionExpression).toBeDefined();
    expect(updates[0].args[0].input.UpdateExpression).not.toMatch(/\bSET\b/);
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('is finished by a second call: the stub stays and the Cognito user stays disabled', async () => {
    // AUTH-06, D-109
    users.set('user-1', { ...BANNED_ROW });
    await handler(confirm(true));

    const again = await handler(confirm(true));

    expect(again.statusCode).toBe(200);
    expect(users.get('user-1')).toEqual(STUB);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
  });
});

describe('DELETE /api/profile with confirm false only checks (PROF-21, D-71, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
    ['the stub of a banned member', STUB],
    ['a caller with no row', undefined],
  ])('answers deleted false for %s and changes nothing', async (_name, stored) => {
    // PROF-21, D-71, D-109
    if (stored) users.set('user-1', { ...stored });
    const before = snapshot();

    const result = await handler(confirm(false));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: false });
    expect(snapshot()).toEqual(before);
    nothingWritten();
  });
});

describe('DELETE /api/profile reads its body strictly (PROF-22, D-101, D-109)', () => {
  it.each([
    ['no body', undefined],
    ['an empty object', '{}'],
    ['confirm as a string', '{"confirm":"true"}'],
    ['confirm as null', '{"confirm":null}'],
    ['confirm as a number', '{"confirm":1}'],
    ['a body that is not JSON', 'not json'],
    ['an empty string', ''],
    ['a list', '[true]'],
  ])('refuses %s with 400 INVALID_INPUT and reads and writes nothing', async (_name, body) => {
    // PROF-22, D-101, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(eventAs(MEMBER, body));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(dbMock.calls()).toHaveLength(0);
    expect(cognitoCalls()).toHaveLength(0);
    expect(users.get('user-1')).toEqual(FULL_ROW);
  });
});

describe('DELETE /api/profile past the daily write budget (PROF-23, R-21, D-109)', () => {
  it('refuses confirm true with RATE_LIMITED and Retry-After, touching nothing; confirm false still answers', async () => {
    // PROF-23, R-21, D-109
    users.set('user-1', { ...FULL_ROW });
    counters.set(WRITE_BUDGET, WRITES_PER_DAY);

    const refused = await handler(confirm(true));

    expect(refused.statusCode).toBe(429);
    expect(bodyOf(refused)).toEqual({ code: 'RATE_LIMITED' });
    expect(refused.headers['retry-after']).toBe('43200');
    expect(users.get('user-1')).toEqual(FULL_ROW);
    expect(cognitoCalls()).toHaveLength(0);
    expect(markers.size).toBe(0);
    expect(counters.get(WRITE_BUDGET)).toBe(WRITES_PER_DAY);

    const check = await handler(confirm(false));

    expect(check.statusCode).toBe(200);
    expect(bodyOf(check)).toEqual({ deleted: false });
    expect(counters.get(WRITE_BUDGET)).toBe(WRITES_PER_DAY);
  });

  it('lets the last unit of the budget through', async () => {
    // PROF-23, R-21
    users.set('user-1', { ...FULL_ROW });
    counters.set(WRITE_BUDGET, WRITES_PER_DAY - 1);

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(users.has('user-1')).toBe(false);
  });

  it('counts per member: another member at the limit does not stop this one', async () => {
    // PROF-23, R-21
    users.set('user-1', { ...FULL_ROW });
    counters.set(`write_budget#user-2#${DAY}`, WRITES_PER_DAY);

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
  });

  it('allows the delete again at 00:00:00 UTC', async () => {
    // PROF-23, R-21, R-06
    users.set('user-1', { ...FULL_ROW });
    counters.set(WRITE_BUDGET, WRITES_PER_DAY);
    expect((await handler(confirm(true))).statusCode).toBe(429);

    vi.setSystemTime(new Date('2026-11-16T00:00:00Z'));
    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(users.has('user-1')).toBe(false);
  });
});

describe('DELETE /api/profile when Cognito fails after the row is gone (PROF-24, D-109)', () => {
  it('throws and writes no marker; the retry finishes, a missing Cognito user counting as done', async () => {
    // PROF-24, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    users.set('user-1', { ...FULL_ROW });
    cognitoError = new Error('Cognito is down');

    await expect(handler(confirm(true))).rejects.toThrow();

    expect(users.has('user-1')).toBe(false);
    expect(markers.size).toBe(0);

    cognitoError = new UserNotFoundException({ message: 'User does not exist.', $metadata: {} });
    const retry = await handler(confirm(true));

    expect(retry.statusCode).toBe(200);
    expect(bodyOf(retry)).toEqual({ deleted: true });
    expect(markers.has(MARKER)).toBe(true);
  });

  it('does the same for a banned member whose sign-in cannot be disabled', async () => {
    // PROF-24, D-71, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    users.set('user-1', { ...BANNED_ROW });
    cognitoError = new Error('Cognito is down');

    await expect(handler(confirm(true))).rejects.toThrow();

    expect(users.get('user-1')).toEqual(STUB);
    expect(markers.size).toBe(0);

    cognitoError = new UserNotFoundException({ message: 'User does not exist.', $metadata: {} });
    const retry = await handler(confirm(true));

    expect(retry.statusCode).toBe(200);
    expect(users.get('user-1')).toEqual(STUB);
    expect(markers.has(MARKER)).toBe(true);
  });

  it('answers a server error and writes no marker when the Cognito call fails with a throttle', async () => {
    // PROF-24, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    users.set('user-1', { ...FULL_ROW });
    cognitoError = Object.assign(new Error('Rate exceeded'), { name: 'TooManyRequestsException' });

    await expect(handler(confirm(true))).rejects.toThrow();

    expect(markers.size).toBe(0);
  });
});

describe('DELETE /api/profile for a member banned after the row was read (PROF-25, D-71, R-08, D-109)', () => {
  it('takes the banned path: the row shrinks to user_id and status, the Cognito user is disabled, never deleted', async () => {
    // PROF-25, D-71, R-08, D-109
    users.set('user-1', { ...FULL_ROW });
    afterRead = () => users.set('user-1', { ...BANNED_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(STUB);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
    expect(cognitoMock.commandCalls(AdminDisableUserCommand)).toHaveLength(1);
    expect(order).toEqual(['limit', 'read', 'delete', 'ban', 'cognito-disable', 'marker']);
    expect(markers.has(MARKER)).toBe(true);
  });
});

describe('DELETE /api/profile acts only on the token, never on the body (PROF-26, R-01, R-22, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
  ])(
    'calls Cognito with the token username and ignores the body, for %s',
    async (_name, stored) => {
      // PROF-26, R-01, D-109
      users.set('user-1', { ...stored });
      users.set('victim', { ...FULL_ROW, user_id: 'victim' });

      await handler(
        eventAs(MEMBER, {
          confirm: true,
          username: 'Google_victim',
          user_id: 'victim',
          sub: 'victim',
          UserPoolId: 'another-pool',
        })
      );

      const calls = [
        ...cognitoMock.commandCalls(AdminDeleteUserCommand),
        ...cognitoMock.commandCalls(AdminDisableUserCommand),
      ];
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({ UserPoolId: POOL, Username: 'Google_1001' });
      const touched = JSON.stringify(dbMock.calls().map((call) => call.args[0].input));
      expect(touched).not.toContain('victim');
      expect(users.get('victim')).toEqual({ ...FULL_ROW, user_id: 'victim' });
    }
  );

  it('uses the username, not the subject, for a member whose two differ', async () => {
    // PROF-26, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    const [call] = cognitoMock.commandCalls(AdminDeleteUserCommand);
    expect(call.args[0].input.Username).not.toBe('user-1');
  });

  it.each([
    ['no cognito:username', TOKEN_WITHOUT_USERNAME],
    ['an empty cognito:username', { ...TOKEN_WITHOUT_USERNAME, 'cognito:username': '' }],
  ])('refuses a token with %s: 401 UNAUTHORIZED, nothing touched', async (_name, claims) => {
    // PROF-26, R-22, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true, claims));

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    expect(dbMock.calls()).toHaveLength(0);
    expect(cognitoCalls()).toHaveLength(0);
    expect(users.get('user-1')).toEqual(FULL_ROW);
  });
});

describe('The marker of a deleted account (PROF-28, D-109)', () => {
  it.each([
    ['deleting an active member', FULL_ROW],
    ['disabling a banned member', BANNED_ROW],
  ])('is written after %s, with expires_at one ID-token life ahead', async (_name, stored) => {
    // PROF-28, D-109
    users.set('user-1', { ...stored });

    await handler(confirm(true));

    const writes = dbMock.commandCalls(UpdateCommand, { TableName: COUNTERS });
    const marker = writes.find((call) => call.args[0].input.Key?.key === MARKER);
    expect(marker?.args[0].input.Key).toEqual({ key: MARKER });
    expect(markers.get(MARKER)).toContain(NOW_SECONDS + ID_TOKEN_LIFE_SECONDS);
    expect(order.at(-1)).toBe('marker');
  });

  it('is not written by a check, a refusal or a bad body', async () => {
    // PROF-28, D-109
    users.set('user-1', { ...FULL_ROW });
    counters.set(WRITE_BUDGET, WRITES_PER_DAY);

    await handler(confirm(false));
    await handler(confirm(true));
    await handler(eventAs(MEMBER, '{}'));

    expect(markers.size).toBe(0);
  });

  it('makes GET /profile answer 401 with the old token, and no row is made (PROF-14)', async () => {
    // PROF-14, PROF-28, D-59, D-71, D-109
    users.set('user-1', { ...FULL_ROW });
    expect((await getProfile(asProfileCall(MEMBER))).statusCode).toBe(200);

    await handler(confirm(true));
    order = [];
    const old = await getProfile(asProfileCall(MEMBER));

    expect(old.statusCode).toBe(401);
    expect(bodyOf(old)).toEqual({ code: 'UNAUTHORIZED' });
    expect(users.has('user-1')).toBe(false);
    expect(order).not.toContain('put');
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('makes GET /profile answer 401 for a deleted banned member, and the stub stays as it is (PROF-14)', async () => {
    // PROF-14, PROF-28, D-71, D-109
    users.set('user-1', { ...BANNED_ROW });
    await handler(confirm(true));

    const old = await getProfile(asProfileCall(MEMBER));

    expect(old.statusCode).toBe(401);
    expect(bodyOf(old)).toEqual({ code: 'UNAUTHORIZED' });
    expect(users.get('user-1')).toEqual(STUB);
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(dbMock.commandCalls(UpdateCommand, { TableName: USERS })).toHaveLength(1);
  });

  it("never affects another member: the same call with another member's token still works (PROF-14)", async () => {
    // PROF-14, PROF-28, D-109
    users.set('user-1', { ...FULL_ROW });
    await handler(confirm(true));

    const other = await getProfile(asProfileCall(OTHER_MEMBER));

    expect(other.statusCode).toBe(200);
    expect(users.get('user-2')).toMatchObject({ user_id: 'user-2', status: 'active' });
  });

  it('does not refuse a member whose delete stopped before the marker, so the retry can finish', async () => {
    // PROF-24, PROF-28, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    users.set('user-1', { ...FULL_ROW });
    cognitoError = new Error('Cognito is down');
    await expect(handler(confirm(true))).rejects.toThrow();

    const profile = await getProfile(asProfileCall(MEMBER));

    expect(profile.statusCode).toBe(200);
  });
});
