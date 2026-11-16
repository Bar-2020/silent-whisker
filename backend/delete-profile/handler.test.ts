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
import { TERMS_VERSION } from '../../shared/constants/profile';
import { handler as getProfile } from '../get-profile/handler';
import type { ApiEvent } from '../shared/api.types';
import type { UserRow } from '../shared/schemas/user-row.schema';
import { handler as patchProfile } from '../update-profile/handler';
import { handler } from './handler';

const dbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

const USERS = 'users';
const COUNTERS = 'daily_usage_counters';
const POOL = 'eu-north-1_pool';
const NOW = new Date('2026-11-15T12:00:00Z');
const DELETED_AT = NOW.toISOString();

const MEMBER = { sub: 'user-1', token_use: 'id', 'cognito:username': 'Google_1001' };
const NEW_SIGN_IN = { ...MEMBER, auth_time: '1763294400', jti: 'another-token' };
const OTHER_MEMBER = { sub: 'user-2', token_use: 'id', 'cognito:username': 'Google_1002' };
const TOKEN_WITHOUT_USERNAME = { sub: 'user-1', token_use: 'id' };

// What a deleted account leaves (D-109): user_id, status and the mark, nothing else.
const MARKED_ACTIVE = { user_id: 'user-1', status: 'active', deleted_at: DELETED_AT };
const MARKED_BANNED = { user_id: 'user-1', status: 'banned', deleted_at: DELETED_AT };

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
interface DbInput {
  Key?: Record<string, string>;
  UpdateExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
}

// The users table as the real one answers, so a second call sees what the first wrote.
const users = new Map<string, Item>();
/** Which call came when, across both clients. */
let order: string[] = [];
/** Runs after a row was read: the moment another request can change it. */
let afterRead: (() => void) | undefined;
let cognitoError: Error | undefined;

const keyOf = (input: DbInput): string => Object.values(input.Key ?? {})[0] ?? '';

const NEXT_CLAUSE = '(?=\\s+(?:SET|REMOVE|ADD|DELETE)\\s|$)';

/** Splits at the commas outside brackets, so `if_not_exists(a, :b)` stays one piece. */
function splitTopLevel(text: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let start = 0;
  for (let at = 0; at < text.length; at += 1) {
    if (text[at] === '(') depth += 1;
    if (text[at] === ')') depth -= 1;
    if (text[at] === ',' && depth === 0) {
      pieces.push(text.slice(start, at));
      start = at + 1;
    }
  }
  pieces.push(text.slice(start));
  return pieces.map((piece) => piece.trim()).filter((piece) => piece !== '');
}

/** DynamoDB's own reading of `SET a = :v, b = if_not_exists(b, :w) REMOVE c, d`; an update that makes a missing row makes it from its key. */
function applyUpdate(input: DbInput): void {
  const names = input.ExpressionAttributeNames ?? {};
  const values = input.ExpressionAttributeValues ?? {};
  const expression = input.UpdateExpression ?? '';
  const nameOf = (token: string) => names[token.trim()] ?? token.trim();
  const valueOf = (token: string) => {
    if (!(token in values)) throw new Error(`update uses an unknown value ${token}`);
    return values[token];
  };
  const clause = (keyword: string) => {
    const pattern = new RegExp(`\\b${keyword}\\s+(.*?)${NEXT_CLAUSE}`, 's');
    return splitTopLevel(pattern.exec(expression)?.[1] ?? '');
  };
  const id = keyOf(input);
  const row: Item = users.get(id) ?? { user_id: id };
  const evaluate = (right: string): unknown => {
    if (!right.startsWith('if_not_exists(')) return valueOf(right);
    const [source = '', fallback = ''] = right.slice('if_not_exists('.length, -1).split(',');
    return row[nameOf(source)] ?? valueOf(fallback.trim());
  };
  for (const assignment of clause('SET')) {
    const [left = '', right = ''] = assignment.split(/=(.*)/s).map((part) => part.trim());
    row[nameOf(left)] = evaluate(right);
  }
  for (const name of clause('REMOVE')) Reflect.deleteProperty(row, nameOf(name));
  users.set(id, row);
}

function fakeDatabase(): void {
  dbMock.on(GetCommand, { TableName: USERS }).callsFake((input: DbInput) => {
    order.push('read');
    const item = users.get(keyOf(input));
    const copy = item && structuredClone(item);
    afterRead?.();
    return { Item: copy };
  });
  dbMock.on(PutCommand, { TableName: USERS }).callsFake((input: { Item: Item }) => {
    order.push('put');
    const id = String(input.Item.user_id);
    if (users.has(id)) throw conditionFailed();
    users.set(id, structuredClone(input.Item));
    return {};
  });
  dbMock.on(DeleteCommand, { TableName: USERS }).callsFake((input: DbInput) => {
    order.push('delete');
    users.delete(keyOf(input));
    return {};
  });
  dbMock.on(UpdateCommand, { TableName: USERS }).callsFake((input: DbInput) => {
    order.push('update');
    applyUpdate(input);
    return {};
  });
  // D-109: the delete never moves a write counter; if it asked, the budget is used up.
  dbMock.on(GetCommand, { TableName: COUNTERS }).rejects(conditionFailed());
  dbMock.on(UpdateCommand, { TableName: COUNTERS }).rejects(conditionFailed());
  const cognito = (label: string) => () => {
    order.push(label);
    if (cognitoError) throw cognitoError;
    return {};
  };
  cognitoMock.on(AdminDeleteUserCommand).callsFake(cognito('cognito-delete'));
  cognitoMock.on(AdminDisableUserCommand).callsFake(cognito('cognito-disable'));
}

// The settings update-profile needs; the delete itself needs only USERS_TABLE and USER_POOL_ID.
const UPDATE_PROFILE_SETTINGS = {
  COUNTERS_TABLE: COUNTERS,
  GEOCODE_TABLE: 'geocode_cache',
  ALERT_TOPIC_ARN: 'arn:aws:sns:eu-north-1:123456789012:alerts-delete-test',
  GUARDRAIL_ID: 'gr-id',
  GUARDRAIL_VERSION: '1',
};

beforeEach(() => {
  users.clear();
  order = [];
  afterRead = undefined;
  cognitoError = undefined;
  dbMock.reset();
  cognitoMock.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  process.env.USERS_TABLE = USERS;
  process.env.USER_POOL_ID = POOL;
  for (const name of Object.keys(UPDATE_PROFILE_SETTINGS)) {
    Reflect.deleteProperty(process.env, name);
  }
  fakeDatabase();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const bodyOf = (result: { body: string }): unknown => JSON.parse(result.body);
const snapshot = (): Record<string, Item> => structuredClone(Object.fromEntries(users));
const cognitoCalls = () => cognitoMock.calls();
const rowWrites = () => [
  ...dbMock.commandCalls(UpdateCommand),
  ...dbMock.commandCalls(PutCommand),
  ...dbMock.commandCalls(DeleteCommand),
];
const nothingWritten = () => {
  expect(rowWrites()).toHaveLength(0);
  expect(cognitoCalls()).toHaveLength(0);
};
/** The one read of the caller's row and nothing else (D-109: a deleted account stops there). */
const onlyTheRowRead = () => {
  expect(dbMock.calls()).toHaveLength(1);
  expect(dbMock.commandCalls(GetCommand, { TableName: USERS })).toHaveLength(1);
};
const counterTouched = () => {
  const touched = JSON.stringify(dbMock.calls().map((call) => call.args[0].input));
  return touched.includes(COUNTERS) || touched.includes('write_budget');
};
const disableCalls = () => cognitoMock.commandCalls(AdminDisableUserCommand);
const deleteCalls = () => cognitoMock.commandCalls(AdminDeleteUserCommand);

describe('DELETE /api/profile only accepts a member (AUTH-01, AUTH-02, R-22)', () => {
  it.each([
    ['no verified claims', { requestContext: {}, body: '{"confirm":true}' }],
    ['an access token', confirm(true, { ...MEMBER, token_use: 'access' })],
    ['claims with no subject', confirm(true, { token_use: 'id', 'cognito:username': 'Google_1' })],
  ])('refuses %s with 401 UNAUTHORIZED and reads and writes nothing', async (_name, event) => {
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

describe('DELETE /api/profile reads the caller first (PROF-14, PROF-29, D-109, D-59)', () => {
  it('reads the row of the token subject with a consistent read, before the body is looked at', async () => {
    // PROF-29, D-109, D-59
    users.set('user-1', { ...FULL_ROW });
    users.set('victim', { ...FULL_ROW, user_id: 'victim' });

    const result = await handler(eventAs(MEMBER, '{}'));

    expect(result.statusCode).toBe(400);
    onlyTheRowRead();
    const [read] = dbMock.commandCalls(GetCommand, { TableName: USERS });
    expect(read.args[0].input.Key).toEqual({ user_id: 'user-1' });
    expect(read.args[0].input.ConsistentRead).toBe(true);
  });

  it('works with only USERS_TABLE and USER_POOL_ID set: it has no counters table', async () => {
    // PROF-23, D-109
    users.set('user-1', { ...FULL_ROW });
    expect(process.env.COUNTERS_TABLE).toBeUndefined();

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
  });
});

describe('DELETE /api/profile with confirm true deletes an active member (PROF-12, D-71, R-07, D-109)', () => {
  it('reads the row, erases and marks it in one update, disables the Cognito user, and answers deleted true', async () => {
    // PROF-12, D-71, R-07, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
    expect(order).toEqual(['read', 'update', 'cognito-disable']);
  });

  it('makes one update on the member own row, with no condition, and no put and no delete', async () => {
    // PROF-12, D-109
    users.set('user-1', { ...FULL_ROW });
    users.set('user-2', { ...FULL_ROW, user_id: 'user-2' });

    await handler(confirm(true));

    const updates = dbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.TableName).toBe(USERS);
    expect(updates[0].args[0].input.Key).toEqual({ user_id: 'user-1' });
    expect(updates[0].args[0].input.ConditionExpression).toBeUndefined();
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(dbMock.commandCalls(DeleteCommand)).toHaveLength(0);
    expect(users.get('user-2')).toEqual({ ...FULL_ROW, user_id: 'user-2' });
  });

  it('disables the Cognito user of this pool by the token username, and never deletes it', async () => {
    // PROF-12, R-07, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    expect(disableCalls()).toHaveLength(1);
    expect(disableCalls()[0].args[0].input).toEqual({ UserPoolId: POOL, Username: 'Google_1001' });
    expect(deleteCalls()).toHaveLength(0);
  });

  it('removes every personal attribute, whatever the row held', async () => {
    // PROF-12, PROF-28, R-07, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    expect(Object.keys(users.get('user-1') ?? {}).toSorted()).toEqual([
      'deleted_at',
      'status',
      'user_id',
    ]);
  });
});

describe('DELETE /api/profile before the terms are accepted, or with no row (PROF-13, R-36, D-109)', () => {
  it('works for a member who has not accepted the terms yet', async () => {
    // PROF-13, R-36
    users.set('user-1', { ...NEW_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
    expect(disableCalls()).toHaveLength(1);
  });

  it('gives a caller with no row a row holding only user_id, status active and deleted_at', async () => {
    // PROF-13, D-109
    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
    expect(disableCalls()).toHaveLength(1);
    expect(deleteCalls()).toHaveLength(0);
  });
});

describe('DELETE /api/profile with confirm true for a banned member keeps the ban (AUTH-06, D-71, R-08, D-109)', () => {
  it('leaves user_id, status banned and deleted_at, disables the Cognito user and never deletes it', async () => {
    // AUTH-06, D-71, R-08, D-109
    users.set('user-1', { ...BANNED_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_BANNED);
    expect(disableCalls()).toHaveLength(1);
    expect(disableCalls()[0].args[0].input).toEqual({ UserPoolId: POOL, Username: 'Google_1001' });
    expect(deleteCalls()).toHaveLength(0);
    expect(order).toEqual(['read', 'update', 'cognito-disable']);
  });
});

describe('DELETE /api/profile with confirm false only checks (PROF-21, D-71, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
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
    expect(counterTouched()).toBe(false);
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
  ])('refuses %s with 400 INVALID_INPUT and writes nothing', async (_name, body) => {
    // PROF-22, D-101, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(eventAs(MEMBER, body));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    nothingWritten();
    expect(users.get('user-1')).toEqual(FULL_ROW);
  });
});

describe('DELETE /api/profile does not use the daily write budget (PROF-23, R-21, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW, MARKED_ACTIVE],
    ['a banned member', BANNED_ROW, MARKED_BANNED],
  ])(
    'confirm true works for %s whose daily writes are used up (the counters table refuses every call)',
    async (_name, stored, expected) => {
      // PROF-23, R-21, D-109
      users.set('user-1', { ...stored });

      const result = await handler(confirm(true));

      expect(result.statusCode).toBe(200);
      expect(bodyOf(result)).toEqual({ deleted: true });
      expect(users.get('user-1')).toEqual(expected);
      expect(counterTouched()).toBe(false);
    }
  );

  it('confirm true works for a member whose counter is untouched, and does not create it', async () => {
    // PROF-23, R-21, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(counterTouched()).toBe(false);
    expect(dbMock.commandCalls(UpdateCommand, { TableName: COUNTERS })).toHaveLength(0);
  });

  it('confirm false neither reads nor moves a counter', async () => {
    // PROF-23, R-21, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(false));

    expect(result.statusCode).toBe(200);
    expect(counterTouched()).toBe(false);
  });
});

describe('The deleted mark (PROF-28, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
    ['a caller with no row', undefined],
  ])('is a UTC time with only user_id and status beside it, for %s', async (_name, stored) => {
    // PROF-28, D-109
    if (stored) users.set('user-1', { ...stored });

    await handler(confirm(true));

    const left = users.get('user-1');
    expect(left?.deleted_at).toBe(DELETED_AT);
    expect(left?.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(Object.keys(left ?? {}).toSorted()).toEqual(['deleted_at', 'status', 'user_id']);
  });

  it('is not written by a check, a bad body or a token with no username', async () => {
    // PROF-28, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(false));
    await handler(eventAs(MEMBER, '{}'));
    await handler(confirm(true, TOKEN_WITHOUT_USERNAME));

    expect(users.get('user-1')).toEqual(FULL_ROW);
  });

  it('never affects another member: user-2 keeps the row and the token still works', async () => {
    // PROF-28, PROF-14, D-109
    users.set('user-1', { ...FULL_ROW });
    users.set('user-2', { ...FULL_ROW, user_id: 'user-2' });
    await handler(confirm(true));

    const other = await getProfile(eventAs(OTHER_MEMBER));

    expect(other.statusCode).toBe(200);
    expect(users.get('user-2')).toEqual({ ...FULL_ROW, user_id: 'user-2' });
    expect((await handler(confirm(true, OTHER_MEMBER))).statusCode).toBe(200);
    expect(users.get('user-2')).toEqual({ ...MARKED_ACTIVE, user_id: 'user-2' });
  });
});

describe('Every route refuses the token of a deleted account (PROF-14, D-59, D-71, D-109)', () => {
  const PATCH_BODY = { display_name: 'Noa Katz', city: 'Haifa', accept_terms: true };

  it.each([
    ['an active member', FULL_ROW, MARKED_ACTIVE],
    ['a banned member', BANNED_ROW, MARKED_BANNED],
  ])('refuses delete, get and update with the old token of %s', async (_name, stored, left) => {
    // PROF-14, D-59, D-71, D-109
    Object.assign(process.env, UPDATE_PROFILE_SETTINGS);
    users.set('user-1', { ...stored });
    expect((await handler(confirm(true))).statusCode).toBe(200);
    dbMock.resetHistory();
    cognitoMock.resetHistory();

    const results = [
      await handler(confirm(true)),
      await handler(confirm(false)),
      await getProfile(eventAs(MEMBER)),
      await patchProfile(eventAs(MEMBER, PATCH_BODY)),
    ];

    expect(results.map((result) => result.statusCode)).toEqual([401, 401, 401, 401]);
    expect(results.map(bodyOf)).toEqual(Array.from(results, () => ({ code: 'UNAUTHORIZED' })));
    nothingWritten();
    expect(counterTouched()).toBe(false);
    expect(snapshot()).toEqual({ 'user-1': left });
  });

  it.each([
    ['get profile', () => getProfile(eventAs(NEW_SIGN_IN))],
    ['update profile', () => patchProfile(eventAs(NEW_SIGN_IN, PATCH_BODY))],
    ['delete profile', () => handler(confirm(true, NEW_SIGN_IN))],
  ])('refuses a new sign-in token of the same member on %s', async (_name, call) => {
    // PROF-14, PROF-24, D-109
    Object.assign(process.env, UPDATE_PROFILE_SETTINGS);
    users.set('user-1', { ...FULL_ROW });
    await handler(confirm(true));
    dbMock.resetHistory();
    cognitoMock.resetHistory();

    const result = await call();

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    nothingWritten();
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
  });

  it("does not refuse another member: the same calls with another member's token work", async () => {
    // PROF-14, D-109
    users.set('user-1', { ...FULL_ROW });
    await handler(confirm(true));

    const other = await getProfile(eventAs(OTHER_MEMBER));

    expect(other.statusCode).toBe(200);
    expect(users.get('user-2')).toMatchObject({ user_id: 'user-2', status: 'active' });
    expect(users.get('user-2')).not.toHaveProperty('deleted_at');
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
  });
});

describe('DELETE /api/profile twice with the same token (PROF-29, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
  ])('answers 401 to confirm true and false for %s, writing nothing', async (_name, stored) => {
    // PROF-29, D-109
    users.set('user-1', { ...stored });
    await handler(confirm(true));
    const left = snapshot();

    for (const again of [true, false]) {
      dbMock.resetHistory();
      cognitoMock.resetHistory();

      const result = await handler(confirm(again));

      expect(result.statusCode).toBe(401);
      expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
      onlyTheRowRead();
      nothingWritten();
      expect(snapshot()).toEqual(left);
    }
  });

  it.each([
    ['an active member', MARKED_ACTIVE],
    ['a banned member', MARKED_BANNED],
  ])('refuses a marked row of %s: confirm true, false, bad body', async (_name, marked) => {
    // PROF-29, D-109
    users.set('user-1', { ...marked });

    for (const event of [confirm(true), confirm(false), eventAs(MEMBER, '{}'), eventAs(MEMBER)]) {
      dbMock.resetHistory();
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
      onlyTheRowRead();
      nothingWritten();
    }
    expect(users.get('user-1')).toEqual(marked);
  });

  it('refuses a marked row before it looks at the token username', async () => {
    // PROF-29, PROF-26, D-109
    users.set('user-1', { ...MARKED_ACTIVE });

    const result = await handler(confirm(true, TOKEN_WITHOUT_USERNAME));

    expect(result.statusCode).toBe(401);
    nothingWritten();
  });
});

describe('DELETE /api/profile when Cognito fails after the row was erased (PROF-24, D-109)', () => {
  const failures: [string, Error][] = [
    ['an error', new Error('Cognito is down')],
    ['a throttle', Object.assign(new Error('Rate exceeded'), { name: 'TooManyRequestsException' })],
  ];

  it.each(failures)('throws on %s, and the row is already marked', async (_name, failure) => {
    // PROF-24, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    users.set('user-1', { ...FULL_ROW });
    cognitoError = failure;

    await expect(handler(confirm(true))).rejects.toThrow();

    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
    expect(order).toEqual(['read', 'update', 'cognito-disable']);
  });

  it.each([
    ['an active member', FULL_ROW, MARKED_ACTIVE],
    ['a banned member', BANNED_ROW, MARKED_BANNED],
  ])('answers 401 to every later call, old token or new, for %s', async (_name, stored, left) => {
    // PROF-24, D-109
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.assign(process.env, UPDATE_PROFILE_SETTINGS);
    users.set('user-1', { ...stored });
    cognitoError = new Error('Cognito is down');
    await expect(handler(confirm(true))).rejects.toThrow();
    cognitoError = undefined;
    dbMock.resetHistory();
    cognitoMock.resetHistory();

    const results = [
      await handler(confirm(true)),
      await handler(confirm(false)),
      await getProfile(eventAs(MEMBER)),
      await patchProfile(eventAs(MEMBER, { show_google_photo: true })),
      await handler(confirm(true, NEW_SIGN_IN)),
      await getProfile(eventAs(NEW_SIGN_IN)),
    ];

    expect(results.map((result) => result.statusCode)).toEqual([401, 401, 401, 401, 401, 401]);
    nothingWritten();
    expect(snapshot()).toEqual({ 'user-1': left });
  });

  it('counts a Cognito user that does not exist as done', async () => {
    // PROF-24, D-109
    users.set('user-1', { ...FULL_ROW });
    cognitoError = new UserNotFoundException({ message: 'User does not exist.', $metadata: {} });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
  });
});

describe('DELETE /api/profile never writes status (PROF-25, D-71, R-08, D-109)', () => {
  it('keeps a member who is banned after the row was read banned, and disables the Cognito user', async () => {
    // PROF-25, D-71, R-08, D-109
    users.set('user-1', { ...FULL_ROW });
    afterRead = () => users.set('user-1', { ...BANNED_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toEqual({ deleted: true });
    expect(users.get('user-1')).toEqual(MARKED_BANNED);
    expect(disableCalls()).toHaveLength(1);
    expect(deleteCalls()).toHaveLength(0);
  });

  it('keeps a member who is unbanned after the row was read active, and disables the Cognito user', async () => {
    // PROF-25, D-71, D-109
    users.set('user-1', { ...BANNED_ROW });
    afterRead = () => users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true));

    expect(result.statusCode).toBe(200);
    expect(users.get('user-1')).toEqual(MARKED_ACTIVE);
    expect(disableCalls()).toHaveLength(1);
  });

  it('keeps the status of a member who is not banned as it is: active stays active', async () => {
    // PROF-25, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    expect(users.get('user-1')?.status).toBe('active');
    expect(disableCalls()).toHaveLength(1);
  });
});

describe('DELETE /api/profile acts only on the token, never on the body (PROF-26, R-01, R-22, D-109)', () => {
  it.each([
    ['an active member', FULL_ROW],
    ['a banned member', BANNED_ROW],
  ])('calls Cognito with the token username, body ignored, for %s', async (_name, stored) => {
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

    expect(disableCalls()).toHaveLength(1);
    expect(disableCalls()[0].args[0].input).toEqual({ UserPoolId: POOL, Username: 'Google_1001' });
    const touched = JSON.stringify(dbMock.calls().map((call) => call.args[0].input));
    expect(touched).not.toContain('victim');
    expect(users.get('victim')).toEqual({ ...FULL_ROW, user_id: 'victim' });
  });

  it('uses the username, not the subject, for a member whose two differ', async () => {
    // PROF-26, D-109
    users.set('user-1', { ...FULL_ROW });

    await handler(confirm(true));

    expect(disableCalls()[0].args[0].input.Username).not.toBe('user-1');
  });

  it.each([
    ['no cognito:username', TOKEN_WITHOUT_USERNAME],
    ['an empty cognito:username', { ...TOKEN_WITHOUT_USERNAME, 'cognito:username': '' }],
  ])('refuses a token with %s: 401, nothing written', async (_name, claims) => {
    // PROF-26, R-22, D-109
    users.set('user-1', { ...FULL_ROW });

    const result = await handler(confirm(true, claims));

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    nothingWritten();
    expect(users.get('user-1')).toEqual(FULL_ROW);
  });
});
