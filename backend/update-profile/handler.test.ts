import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { BREAKER_DAILY_MICRO_USD, TEXT_CHECK_COST_MICRO_USD } from '../../shared/constants/cost';
import { WRITES_PER_DAY } from '../../shared/constants/limits';
import {
  PROFILE_NAME_BLOCKED_WORDS,
  PROFILE_NAME_MIN_LENGTH,
  PROFILE_SAVES_PER_DAY,
  PROFILE_TEXT_MAX_LENGTH,
  PROFILE_TEXT_MIN_LENGTH,
  TERMS_VERSION,
} from '../../shared/constants/profile';
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
    expect(lookup).not.toHaveBeenCalled();
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
    // PROF-05, D-116: one under the name's minimum of 3 (the city's is still 2)
    ['a name of one under the minimum', { display_name: spell('דנ', PROFILE_NAME_MIN_LENGTH - 1) }],
    ['a name of 36 characters', { display_name: spell('אב', PROFILE_TEXT_MAX_LENGTH + 1) }],
    ['a name of 36 Latin letters', { display_name: spell('da', PROFILE_TEXT_MAX_LENGTH + 1) }],
    ['a name of 35 emoji', { display_name: '🐱'.repeat(PROFILE_TEXT_MAX_LENGTH) }],
    [
      'a name that is an emoji family joined by invisible joiners',
      { display_name: '\u{1F468}‍\u{1F469}‍\u{1F467}' },
    ],
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
    ['the minimum of Hebrew letters', spell('דנ', PROFILE_NAME_MIN_LENGTH)],
    ['35 Hebrew letters (70 bytes)', spell('אב', PROFILE_TEXT_MAX_LENGTH)],
    ['35 Arabic letters', spell('عس', PROFILE_TEXT_MAX_LENGTH)],
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

/** Real in a name and in a city alike. */
const REAL_TEXTS: [string, string][] = [
  ['Hebrew with points (niqqud)', 'ש\u{5B8}\u{5C1}לו\u{5B9}ם'],
  ['Arabic with a zero-width non-joiner', 'عبد\u{200C}الله'],
  ['Russian', 'Анна Иванова'],
];

type Row = [string, string][];
const CITY_ONLY_SAVED: Row = [
  ['a letter with fillers around it', FILLERS_AROUND_A_LETTER],
  ['an emoji with a variation selector', EMOJI_WITH_VARIATION_SELECTOR],
  ['two braille letters', TWO_BRAILLE_LETTERS],
];
const NAME_ONLY_SAVED: Row = [
  ['Persian with a half-space', 'می\u{200C}خواهم'],
  ['Hebrew with a right-to-left mark', 'דנה\u{200F} לוי'],
];
const CITY_ONLY_REFUSED: Row = [
  ['braille blanks and a space', `${BRAILLE_BLANK} ${BRAILLE_BLANK}`],
];
const NAME_ONLY_REFUSED: Row = [
  ['a letter with fillers around it', FILLERS_AROUND_A_LETTER],
  ['an emoji with a variation selector', EMOJI_WITH_VARIATION_SELECTOR],
  ['two braille letters', TWO_BRAILLE_LETTERS],
  ['three braille letters', `${TWO_BRAILLE_LETTERS}\u{2805}`],
  ['a letter with a variation selector', `Dana${VARIATION_SELECTOR}`],
  ['a zero-width space inside a name', `Da${ZERO_WIDTH_SPACE}na`],
  ['a Hangul filler between two words', `Dana${HALFWIDTH_HANGUL_FILLER}Levi`],
];

describe.each([
  ['display_name', NAME_ONLY_SAVED, NAME_ONLY_REFUSED],
  ['city', CITY_ONLY_SAVED, CITY_ONLY_REFUSED],
])(
  'PATCH /api/profile and a %s that draws nothing (PROF-19, D-61, D-92, D-116)',
  (field, extraSaved, extraRefused) => {
    const refusedWithNothingSpent = async (value: string) => {
      const result = await handler(patch({ ...FIRST_SAVE, [field]: value }));

      expect(result.statusCode).toBe(400);
      expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
      expect(counters.size).toBe(0);
      expect(dbMock.commandCalls(UpdateCommand)).toHaveLength(0);
      expect(userWrites()).toHaveLength(0);
      expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
      expect(lookup).not.toHaveBeenCalled();
    };

    const savedAsTyped = async (value: string) => {
      const result = await handler(patch({ [field]: value }));

      expect(result.statusCode).toBe(200);
      expect(userWrites()[0].args[0].input.ExpressionAttributeValues).toMatchObject({
        [`:${field}`]: value,
      });
      expect(bodyOf(result)).toMatchObject({ [field]: value });
      expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(1);
    };

    it.each([
      ['Hangul fillers', HANGUL_FILLER.repeat(PROFILE_TEXT_MIN_LENGTH)],
      ['braille blanks', BRAILLE_BLANK.repeat(PROFILE_TEXT_MIN_LENGTH)],
      ['variation selectors', VARIATION_SELECTOR.repeat(PROFILE_TEXT_MIN_LENGTH)],
      ['zero-width spaces', ZERO_WIDTH_SPACE.repeat(PROFILE_TEXT_MIN_LENGTH)],
      ['all five invisible characters together', MIXED_INVISIBLE],
    ])('refuses only %s: INVALID_INPUT, nothing saved, no paid check', async (_name, value) => {
      // PROF-19, D-61, D-92
      await refusedWithNothingSpent(value);
    });

    // What differs: the city keeps its old rule (D-92), the full name does not (D-116)
    it.each(extraRefused)(
      'refuses %s: INVALID_INPUT, nothing saved, no paid check',
      async (_name, value) => {
        // PROF-19, D-61, D-92, D-116
        await refusedWithNothingSpent(value);
      }
    );

    it.each([...extraSaved, ...REAL_TEXTS])(
      'saves a real text as typed: %s',
      async (_name, value) => {
        // PROF-19, D-61, D-92, D-116
        await savedAsTyped(value);
      }
    );

    it('counts a filler as a character: the longest text plus a filler is too long', async () => {
      // PROF-19, D-61, D-92
      await refusedWithNothingSpent(`${spell('da', PROFILE_TEXT_MAX_LENGTH)}${HANGUL_FILLER}`);
    });
  }
);

describe('PATCH /api/profile and the full name that does not look like a name (PROF-32, D-116, R-01)', () => {
  const refused = async (display_name: string) => {
    const result = await handler(patch({ ...FIRST_SAVE, display_name }));

    expect(result.statusCode).toBe(400);
    expect(bodyOf(result)).toEqual({ code: 'INVALID_INPUT' });
    expect(counters.size).toBe(0);
    expect(userWrites()).toHaveLength(0);
    expect(bedrockMock.commandCalls(ApplyGuardrailCommand)).toHaveLength(0);
    expect(lookup).not.toHaveBeenCalled();
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
