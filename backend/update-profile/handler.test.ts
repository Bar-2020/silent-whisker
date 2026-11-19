import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, NoSuchKey, S3Client } from '@aws-sdk/client-s3';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { fixtureCity, fixtureRows } from '../../shared/__tests__/city-fixture';
import { CITY_FILES_FOLDER } from '../../shared/constants/cities';
import { BREAKER_DAILY_MICRO_USD, TEXT_CHECK_COST_MICRO_USD } from '../../shared/constants/cost';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import {
  PROFILE_NAME_BLOCKED_WORDS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
  PROFILE_SAVES_PER_DAY,
  TERMS_VERSION,
} from '../../shared/constants/profile';
import type { ApiEvent } from '../shared/api.types';
import type { UserRow } from '../shared/schemas/user-row.schema';
import type { handler as handlerOfModule } from './handler';

const dbMock = mockClient(DynamoDBDocumentClient);
const bedrockMock = mockClient(BedrockRuntimeClient);
const snsMock = mockClient(SNSClient);
const s3Mock = mockClient(S3Client);

const USERS = 'users';
const COUNTERS = 'daily_usage_counters';
const SITE_BUCKET = 'site-bucket';
const NOW = new Date('2026-10-30T12:00:00Z');
const DAY = '2026-10-30';

// The made-up list in S3 (D-117): the codes of `cities/en.json` of the site's bucket
const HAIFA_ID = fixtureCity('Haifa').id;
const JERUSALEM_ID = fixtureCity('Jerusalem').id;
const LISTED_IDS = new Set(fixtureRows('en').map(([id]) => id));
const ID_NOT_ON_THE_LIST = Math.max(...LISTED_IDS) + 1;
const CITY_FILE_KEY = `${CITY_FILES_FOLDER}/en.json`;

/** The function is loaded afresh for each test. */
let handler: typeof handlerOfModule;

/** The body of a `GetObject` answer: the SDK's stream, of which the code reads the text. */
const bodyOfFile = (text: string): GetObjectCommandOutput['Body'] =>
  ({ transformToString: () => Promise.resolve(text) }) as unknown as GetObjectCommandOutput['Body'];

/** The list in S3 as the upload makes it: rows of [code, name, English name, 0 or 1]. */
const fileOfList = (rows: unknown = fixtureRows('en')): string => JSON.stringify(rows);

function listInS3(text: string = fileOfList()): void {
  s3Mock.reset();
  s3Mock.on(GetObjectCommand).resolves({ Body: bodyOfFile(text) });
}

const listReads = () => s3Mock.commandCalls(GetObjectCommand);

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
  city_id: HAIFA_ID,
  terms_version: TERMS_VERSION,
  terms_accepted_at: '2026-10-01T08:00:00.000Z',
  ...extra,
});

const FIRST_SAVE = { display_name: 'Dana Levi', city_id: HAIFA_ID, accept_terms: true };

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
function fakeUsers(member: Record<string, unknown> | undefined): void {
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
const fetchSpy = vi.fn();

/** D-117: the route calls no geocoder: no request leaves for one and no `geocode_cache` row is read or written. */
const noOutsideLookup = () => {
  expect(fetchSpy).not.toHaveBeenCalled();
  // the city list is read from the site's bucket only, never anything else of it
  for (const read of listReads()) {
    expect(read.args[0].input).toEqual({ Bucket: SITE_BUCKET, Key: CITY_FILE_KEY });
  }
  const tables = dbMock.calls().map((call) => JSON.stringify(call.args[0].input));
  expect(tables.some((input) => input.includes('geocode'))).toBe(false);
};

beforeEach(async () => {
  vi.resetModules();
  ({ handler } = await import('./handler'));
  counters.clear();
  dbMock.reset();
  bedrockMock.reset();
  snsMock.reset();
  listInS3();
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  topicCount += 1;
  process.env.USERS_TABLE = USERS;
  process.env.COUNTERS_TABLE = COUNTERS;
  process.env.SITE_BUCKET = SITE_BUCKET;
  process.env.ALERT_TOPIC_ARN = `arn:aws:sns:eu-north-1:123456789012:alerts-${String(topicCount)}`;
  process.env.GUARDRAIL_ID = 'gr-id';
  process.env.GUARDRAIL_VERSION = '1';
  fakeCounters();
  fakeUsers(row());
  bedrockMock.on(ApplyGuardrailCommand).resolves({ action: 'NONE' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

const DELETED_AT = '2026-10-30T11:00:00.000Z';
const MARKED = { user_id: 'user-1', status: 'active', deleted_at: DELETED_AT };
const MARKED_BANNED = { ...MARKED, status: 'banned' };

describe('PATCH /api/profile reads the caller first, in this order (PROF-14, R-08, D-109)', () => {
  it('reads the row once, by the token subject and with a consistent read, before anything else', async () => {
    // PROF-14, D-109, D-59
    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(200);
    const reads = dbMock.commandCalls(GetCommand, { TableName: USERS });
    expect(reads).toHaveLength(1);
    expect(reads[0].args[0].input.Key).toEqual({ user_id: 'user-1' });
    expect(reads[0].args[0].input.ConsistentRead).toBe(true);
    expect(dbMock.calls()[0].args[0]).toBeInstanceOf(GetCommand);
  });

  it.each([
    ['an active member', MARKED],
    ['a banned member', MARKED_BANNED],
  ])('answers 401 for the deleted account of %s, reading only once', async (_name, marked) => {
    // PROF-14, D-109
    fakeUsers(marked);

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(401);
    expect(bodyOf(result)).toEqual({ code: 'UNAUTHORIZED' });
    expect(dbMock.calls()).toHaveLength(1);
    expect(counters.size).toBe(0);
    noOutsideLookup();
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
  });

  it('answers 401 for a deleted account even when the body is bad: the row is read before the body', async () => {
    // PROF-14, D-109
    fakeUsers(MARKED);

    const result = await handler(patch('not json'));

    expect(result.statusCode).toBe(401);
    expect(dbMock.calls()).toHaveLength(1);
  });

  it('answers NOT_FOUND for a caller with no row before it looks at the body', async () => {
    // PROF-14, D-109
    fakeUsers(undefined);

    const result = await handler(patch('not json'));

    expect(result.statusCode).toBe(404);
    expect(counters.size).toBe(0);
  });

  it('answers BANNED for a banned member before it looks at the body (R-08)', async () => {
    // PROF-14, R-08, D-109
    fakeUsers(row({ status: 'banned' }));

    const result = await handler(patch('not json'));

    expect(result.statusCode).toBe(403);
    expect(bodyOf(result)).toEqual({ code: 'BANNED' });
    expect(counters.size).toBe(0);
  });

  it('answers 400 for a bad body only once the member is known, live and not banned', async () => {
    // PROF-14, D-109
    const result = await handler(patch('not json'));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(userWrites()).toHaveLength(0);
  });

  it('makes its row update conditional on the row not being marked deleted', async () => {
    // PROF-14, D-109
    await handler(patch({ show_google_photo: true }));

    const [write] = userWrites();
    expect(write.args[0].input.ConditionExpression).toContain('attribute_not_exists(deleted_at)');
  });

  it('does not save over a delete that lands between the read and the write', async () => {
    // PROF-14, D-109
    fakeUsers(row());
    const refusedWhenMarked = (input: { ConditionExpression?: string }) => {
      if (input.ConditionExpression?.includes('attribute_not_exists(deleted_at)')) {
        throw conditionFailed();
      }
      return { Attributes: row({ show_google_photo: true }) };
    };
    dbMock.on(UpdateCommand, { TableName: USERS }).callsFake(refusedWhenMarked);

    const result = await handler(patch({ show_google_photo: true }));

    // What the answer is for this race is not in the docs (reported); it must refuse, and not as a server error.
    expect(result.statusCode).toBeGreaterThanOrEqual(400);
    expect(result.statusCode).toBeLessThan(500);
    expect(bodyOf(result)).not.toMatchObject({ show_google_photo: true });
  });
});

/** `length` letters of a two-letter pattern: no letter three times in a row (D-116). */
const spell = (pair: string, length: number): string => pair.repeat(length).slice(0, length);

describe('PATCH /api/profile reads its input strictly (PROF-05, D-61, D-92, D-116)', () => {
  it.each([
    ['a name of 1 character', { display_name: 'ד' }],
    // PROF-05, D-116: one under the name's minimum
    ['a name of one under the minimum', { display_name: spell('דנ', PROFILE_NAME_MIN_LENGTH - 1) }],
    ['a name of 36 characters', { display_name: spell('אב', PROFILE_NAME_MAX_LENGTH + 1) }],
    ['a name of 36 Latin letters', { display_name: spell('da', PROFILE_NAME_MAX_LENGTH + 1) }],
    ['a name of 35 emoji', { display_name: '🐱'.repeat(PROFILE_NAME_MAX_LENGTH) }],
    [
      'a name that is an emoji family joined by invisible joiners',
      { display_name: '\u{1F468}‍\u{1F469}‍\u{1F467}' },
    ],
    ['a name of only spaces', { display_name: '    ' }],
    ['a name that is not text', { display_name: 7 }],
    ['show_google_photo that is not true or false', { show_google_photo: 'yes' }],
    ['a name of only zero-width spaces', { display_name: '​​​' }],
    ['a name with a control character', { display_name: 'Dana\u0007Levi' }],
    ['a name with a line break', { display_name: 'Dana\nLevi' }],
    ['a name with a text-direction override', { display_name: 'Dana‮Ivel' }],
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
    ['the minimum of Hebrew letters', spell('דנ', PROFILE_NAME_MIN_LENGTH)],
    ['35 Hebrew letters (70 bytes)', spell('אב', PROFILE_NAME_MAX_LENGTH)],
    ['35 Arabic letters', spell('عس', PROFILE_NAME_MAX_LENGTH)],
    ['Russian', 'Иван Петров'],
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
      // D-117: the old text fields of the city are unknown fields now, ignored like any other
      city: 'Atlantis',
      city_lat: 1,
      city_lng: 2,
    };

    const result = await handler(patch(hostile));

    expect(result.statusCode).toBe(200);
    const [write] = userWrites();
    expect(write.args[0].input.Key).toEqual({ user_id: 'user-1' });
    const written = Object.values(write.args[0].input.ExpressionAttributeNames ?? {});
    expect(written).not.toContain('city');
    expect(written).not.toContain('city_lat');
    expect(written).not.toContain('city_lng');
    expect(bodyOf(result)).not.toHaveProperty('city');
    expect(written).not.toContain('is_admin');
    expect(written).not.toContain('avatar_url');
    expect(written).not.toContain('cats_helped');
    expect(written).not.toContain('user_id');
  });
});

// Characters that draw nothing, built from code points so the source shows what they are (PROF-19, D-92).
const HANGUL_FILLER = '\u{3164}';
const HALFWIDTH_HANGUL_FILLER = '\u{FFA0}';
const BRAILLE_BLANK = '\u{2800}';
const VARIATION_SELECTOR = '\u{FE0F}';
const ZERO_WIDTH_SPACE = '\u{200B}';

const MIXED_INVISIBLE =
  HANGUL_FILLER + HALFWIDTH_HANGUL_FILLER + BRAILLE_BLANK + VARIATION_SELECTOR + ZERO_WIDTH_SPACE;

const FILLERS_AROUND_A_LETTER = `${HANGUL_FILLER}Da${HANGUL_FILLER}na${HANGUL_FILLER}`;
const EMOJI_WITH_VARIATION_SELECTOR = '\u{2764}\u{FE0F}';
const TWO_BRAILLE_LETTERS = '\u{2801}\u{2803}';

const REAL_TEXTS: [string, string][] = [
  ['Hebrew with points (niqqud)', 'ש\u{5B8}\u{5C1}לו\u{5B9}ם'],
  ['Arabic with a zero-width non-joiner', 'عبد\u{200C}الله'],
  ['Russian', 'Анна Иванова'],
  ['Persian with a half-space', 'می\u{200C}خواهم'],
  ['Hebrew with a right-to-left mark', 'דנה\u{200F} לוי'],
];

type Row = [string, string][];
const NAME_ONLY_REFUSED: Row = [
  ['a letter with fillers around it', FILLERS_AROUND_A_LETTER],
  ['an emoji with a variation selector', EMOJI_WITH_VARIATION_SELECTOR],
  ['two braille letters', TWO_BRAILLE_LETTERS],
  ['three braille letters', `${TWO_BRAILLE_LETTERS}\u{2805}`],
  ['a letter with a variation selector', `Dana${VARIATION_SELECTOR}`],
  ['a zero-width space inside a name', `Da${ZERO_WIDTH_SPACE}na`],
  ['a Hangul filler between two words', `Dana${HALFWIDTH_HANGUL_FILLER}Levi`],
];

// PROF-19 concerns the name only: the city has no text rules any more (D-117)
describe('PATCH /api/profile and a name that draws nothing (PROF-19, D-61, D-92, D-116, D-117)', () => {
  const refusedWithNothingSpent = async (value: string) => {
    const result = await handler(patch({ ...FIRST_SAVE, display_name: value }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    noOutsideLookup();
  };

  const savedAsTyped = async (value: string) => {
    const result = await handler(patch({ display_name: value }));

    expect(result.statusCode).toBe(200);
    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':display_name': value,
    });
    expect(bodyOf(result)).toMatchObject({ display_name: value });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(1);
  };

  it.each([
    ['Hangul fillers', HANGUL_FILLER.repeat(PROFILE_NAME_MIN_LENGTH)],
    ['braille blanks', BRAILLE_BLANK.repeat(PROFILE_NAME_MIN_LENGTH)],
    ['variation selectors', VARIATION_SELECTOR.repeat(PROFILE_NAME_MIN_LENGTH)],
    ['zero-width spaces', ZERO_WIDTH_SPACE.repeat(PROFILE_NAME_MIN_LENGTH)],
    ['all five invisible characters together', MIXED_INVISIBLE],
  ])('refuses only %s: INVALID_INPUT, nothing saved, no paid check', async (_name, value) => {
    // PROF-19, D-61, D-92
    await refusedWithNothingSpent(value);
  });

  it.each(NAME_ONLY_REFUSED)(
    'refuses %s: INVALID_INPUT, nothing saved, no paid check',
    async (_name, value) => {
      // PROF-19, D-61, D-92, D-116
      await refusedWithNothingSpent(value);
    }
  );

  it.each(REAL_TEXTS)('saves a real name as typed: %s', async (_name, value) => {
    // PROF-19, D-61, D-92, D-116
    await savedAsTyped(value);
  });

  it('counts a filler as a character: the longest text plus a filler is too long', async () => {
    // PROF-19, D-61, D-92
    await refusedWithNothingSpent(`${spell('da', PROFILE_NAME_MAX_LENGTH)}${HANGUL_FILLER}`);
  });
});

describe('PATCH /api/profile and the full name that does not look like a name (PROF-32, D-116, R-01)', () => {
  const refused = async (display_name: string) => {
    const result = await handler(patch({ ...FIRST_SAVE, display_name }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    noOutsideLookup();
  };

  const saved = async (display_name: string, stored: string) => {
    fakeUsers(row({ display_name: 'Old Name' }));

    const result = await handler(patch({ display_name }));

    expect(result.statusCode).toBe(200);
    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':display_name': stored,
    });
    expect(bodyOf(result)).toMatchObject({ display_name: stored });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(1);
  };

  it.each([
    ['2 letters', 'Da'],
    ['a digit', 'Dana2'],
    ['an emoji', 'Dana 😀'],
    ['an underscore', 'Dana_Levi'],
    ['digits after a name', 'Dana Levi 99'],
    ['a letter three times, in any case', 'Aaa Bbb'],
    ['a letter three times in the second word', 'Dana Lllevi'],
    ['only hyphens', '---'],
    ['only dots and spaces', '. . .'],
    ['two letters and a space', 'D a'],
    ['a blocked word', 'Test'],
    ['a blocked word first', 'admin cohen'],
    ['a blocked word in capitals', 'ADMIN'],
    ['a blocked Hebrew word', 'בדיקה'],
    ['a blocked word after a hyphen', 'Dana-Test'],
    ['a blocked word followed by a dot', 'Test.'],
    ['a blocked word, capitalised, followed by a dot', 'Admin.'],
    ['a blocked word and spaces around it', '  Test  '],
    ['two braille letters', '\u{2801}\u{2803}'],
    ['a letter with Hangul fillers', `D${HANGUL_FILLER}${HANGUL_FILLER}a`],
    ['a letter with a variation selector', `Dana${VARIATION_SELECTOR}`],
    ['a letter from another script (Greek)', 'Αλέξης'],
    ['Chinese characters', '王小明'],
  ])(
    'refuses a name with %s: INVALID_INPUT, nothing saved, no paid check',
    async (_name, value) => {
      // PROF-32, D-116, R-01
      await refused(value);
    }
  );

  it.each([...PROFILE_NAME_BLOCKED_WORDS])(
    'refuses the blocked word %s alone, in capitals and next to a real name',
    async (word) => {
      // PROF-32, D-116, R-01
      for (const value of [
        word,
        word.toUpperCase(),
        `Dana ${word}`,
        `${word} Levi`,
        `Dana-${word}`,
        `${word}.`,
      ]) {
        await refused(value);
      }
    }
  );

  it.each([
    ['two spaces turned into one', 'Dana  Levi', 'Dana Levi'],
    ['a run of spaces turned into one', 'Dana     Levi', 'Dana Levi'],
    ['Hebrew', 'דנה לוי', 'דנה לוי'],
    ['Russian', 'Анна', 'Анна'],
    ['Arabic', 'سارה', 'سارה'],
    ['a hyphen', 'Tom-Ali', 'Tom-Ali'],
    ['an apostrophe', "D'Souza", "D'Souza"],
    ['a curly apostrophe', 'D’Souza', 'D’Souza'],
    ['Hebrew with a geresh', 'ג׳ק כהן', 'ג׳ק כהן'],
    ['Hebrew with gershayim', 'צה״ל לוי', 'צה״ל לוי'],
    ['Hebrew with a maqaf', 'בן־עמי', 'בן־עמי'],
    ['dots', 'O.K. Lee', 'O.K. Lee'],
    ['a Persian name with a half-space', 'می\u{200C}خواهم', 'می\u{200C}خواهم'],
    ['Hebrew with a right-to-left mark', 'דנה\u{200F} לוי', 'דנה\u{200F} לוי'],
    ['a word that only contains a blocked word', 'Contest Levi', 'Contest Levi'],
    ['the same letter twice in a row', 'Anna Lee', 'Anna Lee'],
  ])('saves a name with %s, with the paid check run', async (_name, value, stored) => {
    // PROF-32, D-116, R-01
    await saved(value, stored);
  });
});

describe('PATCH /api/profile and the city list (PROF-09, D-117)', () => {
  const NEW_MEMBER = row({
    display_name: undefined,
    city_id: undefined,
    terms_version: undefined,
    terms_accepted_at: undefined,
  });

  it('knows the places the tests rely on', () => {
    expect(LISTED_IDS.has(HAIFA_ID)).toBe(true);
    expect(LISTED_IDS.has(JERUSALEM_ID)).toBe(true);
    expect(LISTED_IDS.has(ID_NOT_ON_THE_LIST)).toBe(false);
  });

  it('reads the list from cities/en.json of the site bucket, once for a save with a city_id', async () => {
    await handler(patch({ city_id: JERUSALEM_ID }));

    expect(listReads()).toHaveLength(1);
    expect(listReads()[0].args[0].input).toEqual({ Bucket: SITE_BUCKET, Key: CITY_FILE_KEY });
  });

  it('does not read the list at all for a save without a city_id', async () => {
    await handler(patch({ display_name: 'Dana Cohen' }));
    await handler(patch({ show_google_photo: true }));

    expect(listReads()).toHaveLength(0);
  });

  it('saves a code that is on the list as city_id and nothing else about the city, with no outside lookup', async () => {
    const result = await handler(patch({ city_id: JERUSALEM_ID }));

    expect(result.statusCode).toBe(200);
    const [write] = userWrites();
    expect(write.args[0].input.ExpressionAttributeValues).toMatchObject({
      ':city_id': JERUSALEM_ID,
    });
    const written = Object.values(write.args[0].input.ExpressionAttributeNames ?? {});
    expect(written).toContain('city_id');
    expect(written).not.toContain('city');
    expect(written).not.toContain('city_lat');
    expect(written).not.toContain('city_lng');
    const body = bodyOf(result);
    expect(body).toMatchObject({ city_id: JERUSALEM_ID });
    expect(body).not.toHaveProperty('city');
    noOutsideLookup();
  });

  it('saves a first save with a name, a listed code and the terms', async () => {
    fakeUsers(NEW_MEMBER);

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({
      display_name: 'Dana Levi',
      city_id: HAIFA_ID,
      terms_accepted: true,
    });
    noOutsideLookup();
  });

  it.each([
    ['999999', 999999],
    ['0', 0],
    ['-1', -1],
    ['1.5', 1.5],
    ['the text "5000"', '5000'],
    ['null', null],
    ['a list holding a good code', [HAIFA_ID]],
    ['true', true],
    ['an object', { id: HAIFA_ID }],
    ['a code one above the last on the list', ID_NOT_ON_THE_LIST],
  ])('refuses a city_id of %s with nothing spent, checked or saved', async (_name, city_id) => {
    // The name is a good one, so a paid check would run if the city were let through
    const result = await handler(patch({ ...FIRST_SAVE, city_id }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    // No write unit, no save allowance, no check: no counter is touched at all
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    noOutsideLookup();
  });

  it('refuses a code that is not on the list also when it is the only change', async () => {
    const result = await handler(patch({ city_id: 999999 }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
  });

  it('refuses a first save with a name and no city_id, and saves and spends nothing', async () => {
    fakeUsers(NEW_MEMBER);

    const result = await handler(patch({ display_name: 'Dana Levi', accept_terms: true }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
  });

  it('ignores a text city in the body, like any unknown field: no CITY_NOT_FOUND, nothing stored', async () => {
    const result = await handler(patch({ display_name: 'Noa Katz', city: 'Atlantis' }));

    expect(result.statusCode).toBe(200);
    const written = Object.values(userWrites()[0].args[0].input.ExpressionAttributeNames ?? {});
    expect(written).not.toContain('city');
    expect(bodyOf(result)).not.toHaveProperty('city');
    noOutsideLookup();
  });
});

describe('PATCH /api/profile and the list in S3, read at every save and not readable (PROF-36, D-117)', () => {
  const save = (city_id = JERUSALEM_ID) => handler(patch({ city_id }));

  const expectUnavailable = (result: { statusCode: number; body: string }): void => {
    expect(result.statusCode).toBe(503);
    expect(bodyOf(result)).toEqual({ code: 'CHECK_UNAVAILABLE' });
    expect(userWrites()).toHaveLength(0);
    // nothing spent: no write unit, no save allowance, no check
    expect(counters.size).toBe(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('reads the list at every save that carries a city_id: two saves in a row read twice', async () => {
    expect((await save()).statusCode).toBe(200);
    expect((await save(HAIFA_ID)).statusCode).toBe(200);

    expect(listReads()).toHaveLength(2);
    for (const read of listReads()) {
      expect(read.args[0].input).toEqual({ Bucket: SITE_BUCKET, Key: CITY_FILE_KEY });
    }
  });

  it('refuses at the second save a code taken off the list between two saves', async () => {
    expect((await save(HAIFA_ID)).statusCode).toBe(200);
    listInS3(fileOfList(fixtureRows('en').filter(([id]) => id !== HAIFA_ID)));

    const result = await save(HAIFA_ID);

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(listReads()).toHaveLength(1);
  });

  it('accepts at the second save a code put on the list between two saves', async () => {
    listInS3(fileOfList(fixtureRows('en').filter(([id]) => id !== HAIFA_ID)));
    expect((await save(HAIFA_ID)).statusCode).toBe(400);

    listInS3();

    expect((await save(HAIFA_ID)).statusCode).toBe(200);
  });

  it.each([
    [
      'a missing file',
      () =>
        s3Mock.on(GetObjectCommand).rejects(new NoSuchKey({ message: 'no key', $metadata: {} })),
    ],
    ['an S3 error', () => s3Mock.on(GetObjectCommand).rejects(new Error('S3 is down'))],
    [
      'a file that is not JSON',
      () => {
        listInS3('not json');
      },
    ],
    [
      'a file that is not rows',
      () => {
        listInS3(fileOfList({ a: 1 }));
      },
    ],
    [
      'rows of the wrong shape',
      () => {
        listInS3(fileOfList([['Haifa', 1]]));
      },
    ],
    [
      'an empty body',
      () => {
        listInS3('');
      },
    ],
  ])('answers 503 CHECK_UNAVAILABLE and spends nothing for %s', async (_name, arrange) => {
    s3Mock.reset();
    arrange();

    expectUnavailable(await save());
  });

  it('does not remember a failure: the next save works once the file is there', async () => {
    s3Mock.reset();
    s3Mock.on(GetObjectCommand).rejects(new Error('S3 is down'));
    expectUnavailable(await save());
    expectUnavailable(await save());
    expect(listReads()).toHaveLength(2);

    listInS3();
    const result = await save();

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ city_id: JERUSALEM_ID });
    expect(listReads()).toHaveLength(1);
  });

  it('does not remember an invalid file either', async () => {
    listInS3('not json');
    expectUnavailable(await save());

    listInS3();

    expect((await save()).statusCode).toBe(200);
  });

  it('is not needed by a save that has no city_id: it works with the list unreadable', async () => {
    s3Mock.reset();
    s3Mock.on(GetObjectCommand).rejects(new Error('S3 is down'));

    const result = await handler(patch({ display_name: 'Dana Cohen' }));

    expect(result.statusCode).toBe(200);
    expect(listReads()).toHaveLength(0);
  });

  it('refuses a code that is not on the list with INVALID_INPUT, not 503, when the list is readable', async () => {
    const result = await save(ID_NOT_ON_THE_LIST);

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
  });
});

describe('PATCH /api/profile and the terms (PROF-11, D-69, R-36)', () => {
  const NEW_MEMBER = row({
    display_name: undefined,
    city_id: undefined,
    terms_version: undefined,
    terms_accepted_at: undefined,
  });

  it.each([
    ['without accept_terms', { display_name: 'Dana Levi', city_id: HAIFA_ID }],
    [
      'with accept_terms false',
      { display_name: 'Dana Levi', city_id: HAIFA_ID, accept_terms: false },
    ],
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

  it.each([
    ['a name and no city_id', { display_name: 'Dana Levi', accept_terms: true }],
    ['a city_id and no name', { city_id: HAIFA_ID, accept_terms: true }],
  ])(
    'needs both name and city on the first save: %s is refused (PROF-09, D-117)',
    async (_name, body) => {
      fakeUsers(NEW_MEMBER);

      const result = await handler(patch(body));

      expect(result.statusCode).toBe(400);
      expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
      expect(userWrites()).toHaveLength(0);
      expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    }
  );

  it('does not stamp the terms again for a member who accepted them', async () => {
    await handler(patch({ show_google_photo: true, accept_terms: true }));

    const names = Object.values(userWrites()[0].args[0].input.ExpressionAttributeNames ?? {});
    expect(names).not.toContain('terms_accepted_at');
  });
});

describe('PATCH /api/profile runs one paid check, for the name only (PROF-10, D-62, D-117, R-05)', () => {
  it('takes the allowance, checks the name once, then saves the name and the city code', async () => {
    fakeUsers(row({ display_name: undefined, city_id: undefined }));

    const result = await handler(patch(FIRST_SAVE));

    expect(result.statusCode).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(countOf('profile_save#user-1')).toBe(1);
    const checks = bedrockMock.commandCalls(ApplyGuardrailCommand);
    expect(checks).toHaveLength(1);
    expect(checks[0].args[0].input).toMatchObject({
      guardrailIdentifier: 'gr-id',
      guardrailVersion: '1',
      source: 'INPUT',
      content: [{ text: { text: 'Dana Levi' } }],
    });
    expect(countOf('breaker')).toBe(TEXT_CHECK_COST_MICRO_USD);
    expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':display_name': 'Dana Levi',
      ':city_id': HAIFA_ID,
    });
    expect(bodyOf(result)).toMatchObject({ display_name: 'Dana Levi', city_id: HAIFA_ID });
    noOutsideLookup();
  });

  it('checks the name alone, even when a changed city comes with it', async () => {
    const result = await handler(patch({ display_name: 'Dana Cohen', city_id: JERUSALEM_ID }));

    expect(result.statusCode).toBe(200);
    const checks = bedrockMock.commandCalls(ApplyGuardrailCommand);
    expect(checks).toHaveLength(1);
    expect(checks[0].args[0].input).toMatchObject({ content: [{ text: { text: 'Dana Cohen' } }] });
    expect(countOf('profile_save#user-1')).toBe(1);
  });

  it('checks nothing and takes no allowance when only the city changes', async () => {
    const result = await handler(patch({ city_id: JERUSALEM_ID }));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ city_id: JERUSALEM_ID });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(countOf('profile_save#user-1')).toBe(0);
    expect(countOf('breaker')).toBe(0);
    expect(countOf('write_budget#user-1')).toBe(1);
    noOutsideLookup();
  });

  it('lets more city-only saves than the daily limit of name saves through', async () => {
    for (let n = 0; n <= PROFILE_SAVES_PER_DAY; n += 1) {
      const result = await handler(patch({ city_id: n % 2 === 0 ? JERUSALEM_ID : HAIFA_ID }));
      expect(result.statusCode).toBe(200);
    }

    expect(countOf('profile_save#user-1')).toBe(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
  });

  it('checks nothing and takes no allowance when only the photo choice changes', async () => {
    const result = await handler(patch({ show_google_photo: true }));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ show_google_photo: true });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    noOutsideLookup();
    expect(countOf('profile_save#user-1')).toBe(0);
    expect(countOf('write_budget#user-1')).toBe(1);
  });

  it('checks nothing and takes no allowance when only the terms are accepted again', async () => {
    fakeUsers(row({ terms_version: TERMS_VERSION - 1 }));

    const result = await handler(patch({ accept_terms: true }));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ terms_accepted: true });
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(countOf('profile_save#user-1')).toBe(0);
  });

  it('checks the name when only the name changes', async () => {
    await handler(patch({ display_name: 'Dana Cohen' }));

    noOutsideLookup();
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

  it('a refused name saves nothing, not even the city that came with it (PROF-06, D-117)', async () => {
    bedrockMock.on(ApplyGuardrailCommand).resolves({ action: 'GUARDRAIL_INTERVENED' });

    const result = await handler(patch({ display_name: 'Rude Name', city_id: JERUSALEM_ID }));

    expect(result.statusCode).toBe(422);
    expect(userWrites()).toHaveLength(0);
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

  it('does not need the check for a save that changes only the city: the breaker tripped changes nothing (PROF-10, D-117)', async () => {
    trip();

    const result = await handler(patch({ city_id: JERUSALEM_ID }));

    expect(result.statusCode).toBe(200);
    expect(bodyOf(result)).toMatchObject({ city_id: JERUSALEM_ID });
  });
});

describe('PATCH /api/profile and the per-member limits (PROF-08, COST-06, LIM-01, LIM-04, R-21)', () => {
  // D-116: a name has no digits, so each save takes another real-looking name
  const NAMES = [
    'Noa Katz',
    'Yael Mizrahi',
    'Tom Ali',
    'Ron Peretz',
    'Lior Avni',
    'Maya Bar',
    'Eli Zur',
  ];
  const save = (n: number) => handler(patch({ display_name: NAMES[n - 1] }));

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
