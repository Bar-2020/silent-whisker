import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BREAKER_DAILY_MICRO_USD, TEXT_CHECK_COST_MICRO_USD } from '../../shared/constants/cost';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import { PROFILE_SAVES_PER_DAY, TERMS_VERSION } from '../../shared/constants/profile';
import type { ApiEvent } from '../shared/api.types';
import { GeocoderUnavailable, lookupPlace } from '../shared/geocode';
import type { UserRow } from '../shared/schemas/user-row.schema';
import { handler } from './handler';

vi.mock('../shared/geocode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../shared/geocode')>()),
  lookupPlace: vi.fn(),
}));

const dbMock = mockClient(DynamoDBDocumentClient);
const bedrockMock = mockClient(BedrockRuntimeClient);
const snsMock = mockClient(SNSClient);
const lookup = vi.mocked(lookupPlace);

const USERS = 'users';
const COUNTERS = 'daily_usage_counters';
const NOW = new Date('2026-10-30T12:00:00Z');
const DAY = '2026-10-30';
const HAIFA = { lat: 32.79, lng: 34.99, place: 'Haifa, Israel' };

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'The conditional request failed', $metadata: {} });

const patch = (body: unknown, claims: Record<string, string> = {}): ApiEvent => ({
  body: typeof body === 'string' ? body : JSON.stringify(body),
  requestContext: {
    authorizer: { jwt: { claims: { sub: 'user-1', token_use: 'id', ...claims } } },
  },
});

const row = (extra: Partial<UserRow> = {}): UserRow => ({
  user_id: 'user-1',
  status: 'active',
  show_google_photo: false,
  is_admin: false,
  cats_helped: 0,
  feedings: 0,
  waters: 0,
  created_at: '2026-10-01T08:00:00.000Z',
  display_name: 'Dana Levi',
  city: 'Haifa',
  city_lat: HAIFA.lat,
  city_lng: HAIFA.lng,
  terms_version: TERMS_VERSION,
  terms_accepted_at: '2026-10-01T08:00:00.000Z',
  ...extra,
});

const FIRST_SAVE = { display_name: 'Dana Levi', city: 'Haifa', accept_terms: true };

interface CounterInput {
  Key: { key: string };
  ExpressionAttributeValues: Record<string, number | undefined>;
}
interface StoreInput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
}

const counters = new Map<string, number>();
const countOf = (name: string) => counters.get(`${name}#${DAY}`) ?? 0;

/** Counters as the real conditional write behaves: add if it stays within the room, give back if there is enough. */
function fakeCounters(): void {
  dbMock.on(UpdateCommand, { TableName: COUNTERS }).callsFake((input: CounterInput) => {
    const { key } = input.Key;
    const values = input.ExpressionAttributeValues;
    const back = values[':back'];
    const amount = values[':amount'] ?? 0;
    const current = counters.get(key);
    if (back !== undefined) {
      if (current === undefined || current < amount) throw conditionFailed();
      counters.set(key, current + back);
      return {};
    }
    if (current !== undefined && current > (values[':room'] ?? 0)) throw conditionFailed();
    counters.set(key, (current ?? 0) + amount);
    return {};
  });
}

/** The members table: reads give `member`, a write answers with the row as the real update would. */
function fakeUsers(member: UserRow | undefined): void {
  dbMock.on(GetCommand, { TableName: USERS }).resolves({ Item: member });
  dbMock.on(UpdateCommand, { TableName: USERS }).callsFake((input: StoreInput) => {
    const written = Object.fromEntries(
      Object.entries(input.ExpressionAttributeNames)
        .filter(([, name]) => name !== 'status')
        .map(([, name]) => [name, input.ExpressionAttributeValues[`:${name}`]])
    );
    return { Attributes: { ...member, ...written } };
  });
}

const userWrites = () =>
  dbMock.commandCalls(UpdateCommand).filter((call) => call.args[0].input.TableName === USERS);

let topicCount = 0;

beforeEach(() => {
  counters.clear();
  dbMock.reset();
  bedrockMock.reset();
  snsMock.reset();
  lookup.mockReset().mockResolvedValue(HAIFA);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  topicCount += 1;
  process.env.USERS_TABLE = USERS;
  process.env.COUNTERS_TABLE = COUNTERS;
  process.env.GEOCODE_TABLE = 'geocode_cache';
  process.env.ALERT_TOPIC_ARN = `arn:aws:sns:eu-north-1:123456789012:alerts-${String(topicCount)}`;
  process.env.GUARDRAIL_ID = 'gr-id';
  process.env.GUARDRAIL_VERSION = '1';
  fakeCounters();
  fakeUsers(row());
  bedrockMock.on(ApplyGuardrailCommand).resolves({ action: 'NONE' });
});

afterEach(() => {
  vi.useRealTimers();
});

const bodyOf = (result: { body: string }): unknown => JSON.parse(result.body);

describe('PATCH /api/profile only accepts a member (R-22)', () => {
  it.each([
    ['no claims', { requestContext: {}, body: '{}' }],
    ['an access token', patch({}, { token_use: 'access' })],
  ])('refuses %s and touches nothing', async (_name, event) => {
    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    expect(dbMock.calls()).toHaveLength(0);
  });

  it('refuses a banned member before it spends anything (R-08)', async () => {
    fakeUsers(row({ status: 'banned' }));

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(403);
    expect(bodyOf(result)).toEqual({ code: 'BANNED' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
  });

  it('says NOT_FOUND for a member whose row GET /profile has not made yet', async () => {
    fakeUsers(undefined);

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(404);
  });

  it('loses to a ban that lands between the read and the write', async () => {
    dbMock.on(UpdateCommand, { TableName: USERS }).rejects(conditionFailed());

    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(403);
    expect(bodyOf(result)).toEqual({ code: 'BANNED' });
  });
});

describe('PATCH /api/profile reads its input strictly (PROF-05, D-61, D-92)', () => {
  it.each([
    ['a name of 1 character', { display_name: 'ד' }],
    ['a name of 36 characters', { display_name: 'א'.repeat(36) }],
    ['a name of only spaces', { display_name: '    ' }],
    ['a city of 1 character', { city: 'x' }],
    ['a city of 36 characters', { city: 'x'.repeat(36) }],
    ['a name that is not text', { display_name: 7 }],
    ['show_google_photo that is not true or false', { show_google_photo: 'yes' }],
    ['a name of only zero-width spaces', { display_name: '​​​' }],
    ['a name with a control character', { display_name: 'Dana\u0007Levi' }],
    ['a name with a line break', { display_name: 'Dana\nLevi' }],
    ['a name with a text-direction override', { display_name: 'Dana‮Ivel' }],
    ['a city with a text-direction isolate', { city: 'Hai⁧fa' }],
  ])('refuses %s, with nothing spent or saved', async (_name, extra) => {
    const result = await handler(patch({ ...FIRST_SAVE, ...extra }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
  });

  it.each(['not json', '[1, 2]', 'null', ''])('refuses the body %j', async (body) => {
    const result = await handler(patch(body));

    expect(result.statusCode).toBe(400);
  });

  it.each([
    ['2 Hebrew letters', 'דנ'],
    ['35 Hebrew letters (70 bytes)', 'ד'.repeat(35)],
    ['35 Arabic letters', 'ع'.repeat(35)],
    ['Russian', 'Иван Петров'],
    ['35 emoji, each one character', '🐱'.repeat(35)],
    ['an emoji family joined by invisible joiners', '\u{1F468}‍\u{1F469}‍\u{1F467}'],
    ['a Persian name with a half-space', 'می‌خواهم'],
    ['Hebrew with a right-to-left mark', 'דנה‏ לוי'],
  ])('takes %s, counted in characters not bytes', async (_name, display_name) => {
    fakeUsers(row({ display_name: 'Old Name' }));

    const result = await handler(patch({ display_name }));

    expect(result.statusCode).toBe(200);
  });

  it('trims the text before it counts and saves it', async () => {
    fakeUsers(row({ display_name: 'Old Name' }));

    await handler(patch({ display_name: '   Noa Katz  ' }));

    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':display_name': 'Noa Katz',
    });
  });

  it('ignores every field it does not read: the member id is the token, never the body', async () => {
    const hostile = {
      ...FIRST_SAVE,
      display_name: 'Noa Katz',
      user_id: 'someone-else',
      is_admin: true,
      status: 'active',
      avatar_url: 'https://evil.example.com/x',
      cats_helped: 999,
    };

    await handler(patch(hostile));

    const [write] = userWrites();
    expect(write.args[0].input.Key).toEqual({ user_id: 'user-1' });
    const written = Object.values(write.args[0].input.ExpressionAttributeNames ?? {});
    expect(written).not.toContain('is_admin');
    expect(written).not.toContain('avatar_url');
    expect(written).not.toContain('cats_helped');
    expect(written).not.toContain('user_id');
  });
});

describe('PATCH /api/profile and the terms (PROF-11, D-69, R-36)', () => {
  const NEW_MEMBER = row({
    display_name: undefined,
    city: undefined,
    city_lat: undefined,
    city_lng: undefined,
    terms_version: undefined,
    terms_accepted_at: undefined,
  });

  it.each([
    ['without accept_terms', { display_name: 'Dana Levi', city: 'Haifa' }],
    ['with accept_terms false', { display_name: 'Dana Levi', city: 'Haifa', accept_terms: false }],
  ])('refuses a first save %s', async (_name, body) => {
    fakeUsers(NEW_MEMBER);

    const result = await handler(patch(body));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(userWrites()).toHaveLength(0);
  });

  it('stores when and which terms were accepted, in UTC', async () => {
    fakeUsers(NEW_MEMBER);

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ terms_accepted: true });
    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':terms_accepted_at': '2026-10-30T12:00:00.000Z',
      ':terms_version': TERMS_VERSION,
    });
  });

  it('asks again when the terms version has changed', async () => {
    fakeUsers(row({ terms_version: TERMS_VERSION - 1 }));

    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(400);
  });

  it('needs both name and city on the first save', async () => {
    fakeUsers(NEW_MEMBER);

    const result = await handler(patch({ display_name: 'Dana Levi', accept_terms: true }));

    expect(result.statusCode).toBe(400);
  });

  it('does not stamp the terms again for a member who accepted them', async () => {
    await handler(patch({ show_google_photo: true, accept_terms: true }));

    const names = Object.values(userWrites()[0].args[0].input.ExpressionAttributeNames ?? {});
    expect(names).not.toContain('terms_accepted_at');
  });
});

describe('PATCH /api/profile runs one paid check for name and city (PROF-10, D-62, R-05)', () => {
  it('takes the allowance, looks the city up, checks both texts once, then saves', async () => {
    fakeUsers(row({ display_name: undefined, city: undefined, city_lat: undefined }));

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(countOf('profile_save#user-1')).toBe(1);
    expect(lookup).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'Haifa');
    const checks = bedrockMock.commandCalls(ApplyGuardrailCommand);
    expect(checks).toHaveLength(1);
    expect(checks[0].args[0].input).toMatchObject({
      guardrailIdentifier: 'gr-id',
      guardrailVersion: '1',
      source: 'INPUT',
      content: [{ text: { text: 'Dana Levi\nHaifa' } }],
    });
    expect(countOf('breaker')).toBe(TEXT_CHECK_COST_MICRO_USD);
    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':display_name': 'Dana Levi',
      ':city': 'Haifa',
      ':city_lat': HAIFA.lat,
      ':city_lng': HAIFA.lng,
    });
    expect(bodyOf(result)).toMatchObject({ display_name: 'Dana Levi', city: 'Haifa' });
  });

  it('checks nothing and spends nothing when only the photo choice changes', async () => {
    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ show_google_photo: true });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(lookup).not.toHaveBeenCalled();
    expect(countOf('profile_save#user-1')).toBe(0);
    expect(countOf('write_budget#user-1')).toBe(1);
  });

  it('keeps the stored centre when the city is the same and only the name changes', async () => {
    await handler(patch({ display_name: 'Dana Cohen' }));

    expect(lookup).not.toHaveBeenCalled();
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(1);
  });
});

describe('PATCH /api/profile when the text is refused (PROF-06, PROF-09, D-62)', () => {
  it('answers MODERATION_REJECTED, saves nothing, and the allowance stays spent', async () => {
    bedrockMock.on(ApplyGuardrailCommand).resolves({ action: 'GUARDRAIL_INTERVENED' });

    const result = await handler(patch({ display_name: 'Rude Name' }));

    expect(result.statusCode).toBe(422);
    expect(bodyOf(result)).toEqual({ code: 'MODERATION_REJECTED' });
    expect(userWrites()).toHaveLength(0);
    expect(countOf('profile_save#user-1')).toBe(1);
  });

  it('answers CITY_NOT_FOUND, never runs the check, and the allowance stays spent', async () => {
    lookup.mockResolvedValue(undefined);

    const result = await handler(patch({ city: 'Atlantis' }));

    expect(result.statusCode).toBe(422);
    expect(bodyOf(result)).toEqual({ code: 'CITY_NOT_FOUND' });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(userWrites()).toHaveLength(0);
    expect(countOf('profile_save#user-1')).toBe(1);
    expect(countOf('breaker')).toBe(0);
  });
});

describe('PATCH /api/profile when the check cannot run (PROF-07, D-62, R-05)', () => {
  const trip = () => counters.set(`breaker#${DAY}`, BREAKER_DAILY_MICRO_USD);

  it.each([
    ['the call throws', () => bedrockMock.on(ApplyGuardrailCommand).rejects(new Error('boom'))],
    [
      'the call times out',
      () => bedrockMock.on(ApplyGuardrailCommand).rejects(new DOMException('t', 'TimeoutError')),
    ],
    [
      'it answers nonsense',
      () =>
        bedrockMock.on(ApplyGuardrailCommand).resolves({ action: 'MAYBE' as unknown as 'NONE' }),
    ],
    ['the breaker has tripped', trip],
  ])(
    'answers 503 CHECK_UNAVAILABLE when %s, saves nothing and gives the allowance back',
    async (_name, arrange) => {
      arrange();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const result = await handler(patch({ display_name: 'Noa Katz' }));

      expect(result.statusCode).toBe(503);
      expect(bodyOf(result)).toEqual({ code: 'CHECK_UNAVAILABLE' });
      expect(userWrites()).toHaveLength(0);
      expect(countOf('profile_save#user-1')).toBe(0);
    }
  );

  it('answers 503 and gives the allowance back when the geocoder is down (PROF-09)', async () => {
    lookup.mockRejectedValue(new GeocoderUnavailable('down'));

    const result = await handler(patch({ city: 'Eilat' }));

    expect(result.statusCode).toBe(503);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(countOf('profile_save#user-1')).toBe(0);
  });
});

describe('PATCH /api/profile and the per-member limits (PROF-08, COST-06, LIM-01, LIM-04, R-21)', () => {
  const save = (n: number) => handler(patch({ display_name: `Name Number ${String(n)}` }));

  it(`refuses save ${String(PROFILE_SAVES_PER_DAY + 1)} of the day with PROFILE_SAVE_DAILY_LIMIT and the time to midnight`, async () => {
    for (let n = 1; n <= PROFILE_SAVES_PER_DAY; n += 1) {
      expect((await save(n)).statusCode).toBe(200);
    }
    userWrites().length = 0;
    dbMock.resetHistory();

    const sixth = await save(6);

    expect(sixth.statusCode).toBe(429);
    expect(bodyOf(sixth)).toEqual({ code: 'PROFILE_SAVE_DAILY_LIMIT' });
    expect(sixth.headers['retry-after']).toBe('43200');
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(PROFILE_SAVES_PER_DAY);
    expect(countOf('write_budget#user-1')).toBe(PROFILE_SAVES_PER_DAY);
  });

  it('allows a save again at 00:00:00 UTC', async () => {
    for (let n = 1; n <= PROFILE_SAVES_PER_DAY; n += 1) await save(n);
    expect((await save(6)).statusCode).toBe(429);

    vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));

    expect((await save(7)).statusCode).toBe(200);
  });

  it('lets exactly five of six saves at once through', async () => {
    const results = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => save(n)));

    expect(results.filter((result) => result.statusCode === 200)).toHaveLength(
      PROFILE_SAVES_PER_DAY
    );
    expect(results.filter((result) => result.statusCode === 429)).toHaveLength(1);
  });

  it('refuses the write after the daily write budget with RATE_LIMITED and Retry-After', async () => {
    counters.set(`write_budget#user-1#${DAY}`, WRITES_PER_DAY);

    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(429);
    expect(bodyOf(result)).toEqual({ code: 'RATE_LIMITED' });
    expect(result.headers['retry-after']).toBe('43200');
    expect(userWrites()).toHaveLength(0);
  });

  it('counts per member: another member at their limit does not stop this one', async () => {
    counters.set(`write_budget#user-2#${DAY}`, WRITES_PER_DAY);
    counters.set(`profile_save#user-2#${DAY}`, PROFILE_SAVES_PER_DAY);

    const result = await handler(patch({ display_name: 'Noa Katz' }));

    expect(result.statusCode).toBe(200);
  });
});
