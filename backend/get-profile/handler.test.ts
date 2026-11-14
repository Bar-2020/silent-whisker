import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TERMS_VERSION } from '../../shared/constants/profile';
import { handler } from './handler';
import type { ApiEvent as ProfileEvent } from '../shared/api.types';
import type { UserRow } from '../shared/schemas/user-row.schema';

const dbMock = mockClient(DynamoDBDocumentClient);

const NOW = new Date('2026-10-28T12:00:00Z');
const PHOTO = 'https://lh3.googleusercontent.com/a/photo=s96-c';

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

const eventWith = (claims?: Record<string, string>): ProfileEvent => ({
  requestContext: { authorizer: claims ? { jwt: { claims } } : undefined },
});

const idToken = (extra: Record<string, string> = {}) =>
  eventWith({ sub: 'user-1', token_use: 'id', picture: PHOTO, ...extra });

const row = (extra: Partial<UserRow> = {}): UserRow => ({
  user_id: 'user-1',
  status: 'active',
  show_google_photo: false,
  is_admin: false,
  cats_helped: 0,
  feedings: 0,
  waters: 0,
  created_at: '2026-10-01T08:00:00.000Z',
  avatar_url: PHOTO,
  ...extra,
});

const body = (result: { body: string }): unknown => JSON.parse(result.body);

beforeEach(() => {
  process.env.USERS_TABLE = 'users';
  dbMock.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/profile (R-22: a member is a valid ID token)', () => {
  it('refuses a call that arrives without verified claims', async () => {
    const result = await handler(eventWith());

    expect(result.statusCode).toBe(401);
    expect(body(result)).toEqual({ code: 'UNAUTHORIZED' });
    expect(dbMock.calls()).toHaveLength(0);
  });

  it('refuses an access token: the API wants the ID token (D-59)', async () => {
    const result = await handler(idToken({ token_use: 'access' }));

    expect(result.statusCode).toBe(401);
    expect(dbMock.calls()).toHaveLength(0);
  });

  it('refuses claims with no subject', async () => {
    const result = await handler(eventWith({ token_use: 'id' }));

    expect(result.statusCode).toBe(401);
    expect(dbMock.calls()).toHaveLength(0);
  });

  it('takes the user id from the token, never from the request (D-59)', async () => {
    dbMock.on(GetCommand).resolves({ Item: row() });
    const hostile = {
      ...idToken(),
      queryStringParameters: { user_id: 'someone-else' },
      body: JSON.stringify({ user_id: 'someone-else' }),
    };

    await handler(hostile);

    const [read] = dbMock.commandCalls(GetCommand);
    expect(read.args[0].input.Key).toEqual({ user_id: 'user-1' });
  });

  it('is never kept by a cache: it answers about one person', async () => {
    dbMock.on(GetCommand).resolves({ Item: row() });

    const result = await handler(idToken());

    expect(result.headers['cache-control']).toBe('no-store');
  });
});

describe('GET /api/profile creates the row on the first call (D-59)', () => {
  it('writes a new active member with no name or city, from the token', async () => {
    dbMock.on(GetCommand).resolves({});
    dbMock.on(PutCommand).resolves({});

    const result = await handler(idToken());

    const [put] = dbMock.commandCalls(PutCommand);
    expect(put.args[0].input).toMatchObject({
      TableName: 'users',
      ConditionExpression: 'attribute_not_exists(user_id)',
      Item: {
        user_id: 'user-1',
        status: 'active',
        show_google_photo: false,
        is_admin: false,
        cats_helped: 0,
        feedings: 0,
        waters: 0,
        created_at: '2026-10-28T12:00:00.000Z',
        avatar_url: PHOTO,
      },
    });
    expect(result.statusCode).toBe(200);
    expect(body(result)).toEqual({
      display_name: null,
      city: null,
      avatar_url: null,
      show_google_photo: false,
      status: 'active',
      terms_accepted: false,
    });
  });

  it('makes one row when two first calls arrive at once, and both get that row', async () => {
    const winner = row({ display_name: 'Dana', city: 'Haifa' });
    dbMock.on(GetCommand).resolvesOnce({}).resolvesOnce({ Item: winner });
    dbMock.on(PutCommand).rejects(conditionFailed());

    const result = await handler(idToken());

    expect(dbMock.commandCalls(PutCommand)).toHaveLength(1);
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
    const [, rereading] = dbMock.commandCalls(GetCommand);
    expect(rereading.args[0].input.ConsistentRead).toBe(true);
    expect(body(result)).toMatchObject({ display_name: 'Dana', city: 'Haifa' });
  });
});

describe('GET /api/profile and the Google photo (D-21)', () => {
  it.each([
    ['another host', 'https://evil.example.com/a/photo'],
    ['a look-alike host', 'https://lh3.googleusercontent.com.evil.example.com/a/photo'],
    ['a host hidden in the address', 'https://lh3.googleusercontent.com@evil.example.com/a/photo'],
    ['plain http', 'http://lh3.googleusercontent.com/a/photo'],
    ['a script address', 'javascript:alert(1)'],
    ['no address at all', ''],
  ])('does not store a picture on %s', async (_name, picture) => {
    dbMock.on(GetCommand).resolves({});
    dbMock.on(PutCommand).resolves({});

    const result = await handler(idToken({ picture }));

    const [put] = dbMock.commandCalls(PutCommand);
    expect(put.args[0].input.Item).not.toHaveProperty('avatar_url');
    expect(body(result)).toMatchObject({ avatar_url: null });
  });

  it('sends the picture only once the member chose to show it, and never before', async () => {
    dbMock
      .on(GetCommand)
      .resolvesOnce({ Item: row() })
      .resolvesOnce({
        Item: row({ show_google_photo: true }),
      });

    const hidden = await handler(idToken());
    const shown = await handler(idToken());

    expect(body(hidden)).toMatchObject({ avatar_url: null, show_google_photo: false });
    expect(body(shown)).toMatchObject({ avatar_url: PHOTO, show_google_photo: true });
  });

  it('keeps the stored picture when the new one is not on Google', async () => {
    dbMock.on(GetCommand).resolves({ Item: row({ show_google_photo: true }) });

    const result = await handler(idToken({ picture: 'https://evil.example.com/a/photo' }));

    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
    expect(body(result)).toMatchObject({ avatar_url: PHOTO });
  });

  it('writes nothing when nothing changed, so most calls only read', async () => {
    dbMock.on(GetCommand).resolves({ Item: row() });

    await handler(idToken());

    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('copies a changed Google picture into avatar_url', async () => {
    const newer = 'https://lh3.googleusercontent.com/a/newer=s96-c';
    dbMock.on(GetCommand).resolves({ Item: row({ show_google_photo: true }) });
    dbMock.on(UpdateCommand).resolves({});

    const result = await handler(idToken({ picture: newer }));

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input).toMatchObject({
      Key: { user_id: 'user-1' },
      UpdateExpression: 'SET avatar_url = :photo',
      ExpressionAttributeValues: { ':photo': newer },
    });
    expect(body(result)).toMatchObject({ avatar_url: newer });
  });
});

const NEWER_PHOTO = 'https://lh3.googleusercontent.com/a/newer=s96-c';

const NAMED_MEMBER = row({
  show_google_photo: true,
  display_name: 'Dana',
  city: 'Haifa',
  terms_version: TERMS_VERSION,
});

// The row is there for the read and gone for the write: the update is refused, the put makes the row.
const rowDeletedAfterRead = () => {
  dbMock.on(GetCommand).resolves({ Item: NAMED_MEMBER });
  dbMock.on(UpdateCommand).rejects(conditionFailed());
  dbMock.on(PutCommand).resolves({});
};

describe('GET /api/profile when the row is deleted while the photo is updated (PROF-18, D-59, D-92)', () => {
  it('makes the photo update conditional on the row still existing, and still copies the photo', async () => {
    // PROF-18, D-59, D-92
    dbMock.on(GetCommand).resolves({ Item: row({ show_google_photo: true }) });
    dbMock.on(UpdateCommand).resolves({});

    const result = await handler(idToken({ picture: NEWER_PHOTO }));

    const updates = dbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input).toMatchObject({
      Key: { user_id: 'user-1' },
      ExpressionAttributeValues: { ':photo': NEWER_PHOTO },
    });
    expect(updates[0].args[0].input.ConditionExpression).toContain('attribute_exists(user_id)');
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(result.statusCode).toBe(200);
    expect(body(result)).toMatchObject({ avatar_url: NEWER_PHOTO });
  });

  it('makes one fresh empty row with the new photo, by a put that needs the row gone, and answers 200', async () => {
    // PROF-18, D-59, D-92
    rowDeletedAfterRead();

    const result = await handler(idToken({ picture: NEWER_PHOTO }));

    const puts = dbMock.commandCalls(PutCommand);
    expect(puts).toHaveLength(1);
    expect(puts[0].args[0].input).toMatchObject({
      TableName: 'users',
      ConditionExpression: 'attribute_not_exists(user_id)',
    });
    expect(puts[0].args[0].input.Item).toEqual({
      user_id: 'user-1',
      status: 'active',
      show_google_photo: false,
      is_admin: false,
      cats_helped: 0,
      feedings: 0,
      waters: 0,
      created_at: '2026-10-28T12:00:00.000Z',
      avatar_url: NEWER_PHOTO,
    });
    expect(result.statusCode).toBe(200);
    expect(body(result)).toEqual({
      display_name: null,
      city: null,
      avatar_url: null,
      show_google_photo: false,
      status: 'active',
      terms_accepted: false,
    });
  });

  it('never writes a row that holds only user_id and avatar_url', async () => {
    // PROF-18, D-59, D-92
    rowDeletedAfterRead();

    await handler(idToken({ picture: NEWER_PHOTO }));

    const [update] = dbMock.commandCalls(UpdateCommand);
    expect(update.args[0].input.ConditionExpression).toContain('attribute_exists(user_id)');
    const [put] = dbMock.commandCalls(PutCommand);
    const keys = Object.keys(put.args[0].input.Item ?? {});
    expect(keys.some((key) => key !== 'user_id' && key !== 'avatar_url')).toBe(true);
  });
});

const BANNED_MEMBER = row({ ...NAMED_MEMBER, status: 'banned' });
const BANNED_PROFILE = {
  display_name: 'Dana',
  city: 'Haifa',
  avatar_url: PHOTO,
  show_google_photo: true,
  status: 'banned',
  terms_accepted: true,
};

describe('GET /api/profile for a banned member whose Google picture changed (PROF-20, D-71, D-21)', () => {
  it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
    ['a banned member', BANNED_MEMBER, BANNED_PROFILE],
  ])('writes no photo for %s, and still answers 200', async (_name, stored, expected) => {
    // PROF-20, D-71, D-21
    dbMock.on(GetCommand).resolves({ Item: stored });

    const result = await handler(idToken({ picture: NEWER_PHOTO }));

    expect(result.statusCode).toBe(200);
    expect(body(result)).toMatchObject(expected);
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
    expect(dbMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('gives back the banned row as it is when the ban lands between the read and the photo update', async () => {
    // PROF-20, D-71, D-21
    dbMock
      .on(GetCommand)
      .resolvesOnce({ Item: { ...BANNED_MEMBER, status: 'active' } })
      .resolvesOnce({ Item: BANNED_MEMBER });
    dbMock.on(UpdateCommand).rejects(conditionFailed());
    dbMock.on(PutCommand).rejects(conditionFailed());

    const result = await handler(idToken({ picture: NEWER_PHOTO }));

    const updates = dbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.ConditionExpression).toContain('attribute_exists(user_id)');
    expect(updates[0].args[0].input.ConditionExpression).toContain('status');
    const puts = dbMock.commandCalls(PutCommand);
    expect(puts).toHaveLength(1);
    expect(puts[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(user_id)');
    const [, rereading] = dbMock.commandCalls(GetCommand);
    expect(rereading.args[0].input.ConsistentRead).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(body(result)).toEqual(BANNED_PROFILE);
  });
});

describe('GET /api/profile and the terms (R-36)', () => {
  it.each([
    ['never accepted', {}, false],
    ['accepted an older version', { terms_version: TERMS_VERSION - 1 }, false],
    ['accepted the current version', { terms_version: TERMS_VERSION }, true],
  ])('says terms_accepted for a member who %s', async (_name, accepted, expected) => {
    dbMock.on(GetCommand).resolves({ Item: row(accepted) });

    const result = await handler(idToken());

    expect(body(result)).toMatchObject({ terms_accepted: expected });
  });
});

describe('GET /api/profile when the stored row is damaged', () => {
  it('fails loudly and says which fields are wrong, instead of passing bad data on', async () => {
    dbMock.on(GetCommand).resolves({ Item: { user_id: 'user-1', status: 'active' } });

    await expect(handler(idToken())).rejects.toThrow(/user-1.*show_google_photo/s);
  });
});

describe('GET /api/profile for a banned member (API.md)', () => {
  it('still answers, with the status, so the app can say so', async () => {
    dbMock.on(GetCommand).resolves({ Item: row({ status: 'banned' }) });

    const result = await handler(idToken());

    expect(result.statusCode).toBe(200);
    expect(body(result)).toMatchObject({ status: 'banned' });
  });
});
