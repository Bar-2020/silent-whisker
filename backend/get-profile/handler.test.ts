import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { handler } from './handler';
import type { ProfileEvent, UserRow } from './handler.types';

const dbMock = mockClient(DynamoDBDocumentClient);

const NOW = new Date('2026-10-28T12:00:00Z');
const PHOTO = 'https://lh3.googleusercontent.com/a/photo=s96-c';

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

const eventWith = (claims?: Record<string, string>): ProfileEvent => ({
  requestContext: { authorizer: claims ? { jwt: { claims } } : undefined },
});

/** The claims of a valid ID token, as the API's JWT authorizer hands them over. */
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
      avatar_url: PHOTO,
      show_google_photo: false,
      status: 'active',
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

  it('keeps the stored picture when the new one is not on Google', async () => {
    dbMock.on(GetCommand).resolves({ Item: row() });

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
    dbMock.on(GetCommand).resolves({ Item: row() });
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

describe('GET /api/profile for a banned member (API.md)', () => {
  it('still answers, with the status, so the app can say so', async () => {
    dbMock.on(GetCommand).resolves({ Item: row({ status: 'banned' }) });

    const result = await handler(idToken());

    expect(result.statusCode).toBe(200);
    expect(body(result)).toMatchObject({ status: 'banned' });
  });
});
