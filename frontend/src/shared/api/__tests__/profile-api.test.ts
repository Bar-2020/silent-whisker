// @vitest-environment jsdom
import { z, ZodError } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '@shared/api/api-error';
import { PROFILE_QUERY_KEY, updateProfile } from '@shared/api/profile-api';
import {
  fakeUserManager,
  ID_TOKEN,
  jsonResponse,
  makeUser,
  PROFILE,
} from '@shared/test-support/sign-in-fakes';
import {
  API_PATH_PREFIX,
  STATUS_BAD_REQUEST,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAVAILABLE,
  STATUS_UNPROCESSABLE,
} from '@constants/http';
import type { ProfileResponse, ProfileUpdate } from '@schemas/profile.schema';
import { HAIFA_ID } from '@constants/cities';
import {
  PROFILE_NAME_BLOCKED_WORDS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
} from '@constants/profile';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: FAKE_COGNITO_DOMAIN };
});

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fakeUserManager.reset();
  fakeUserManager.setUser(makeUser());
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, PROFILE));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const bodySchema = z.record(z.string(), z.unknown());

function sentBody(): Record<string, unknown> {
  const body = fetchMock.mock.calls[0][1]?.body;
  if (typeof body !== 'string') throw new Error('the body is not JSON text');
  return bodySchema.parse(JSON.parse(body));
}

async function failureOf(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
  } catch (error) {
    return error;
  }
  throw new Error('the call did not fail');
}

/** Two hours, as the server sends it with the daily save limit (FIRST-09). */
const DAILY_LIMIT_RETRY_AFTER = 7200;

const VALID = { display_name: 'Dana Levi', city_id: HAIFA_ID };

/** A refused body may be thrown at once or rejected later: both are a refusal. */
async function attempt(update: ProfileUpdate): Promise<ProfileResponse> {
  return updateProfile(update);
}

interface Refusal {
  status: number;
  code: string;
  kind: ApiError['kind'];
  retryAfter?: number;
}

const REFUSALS: Refusal[] = [
  {
    status: STATUS_TOO_MANY_REQUESTS,
    code: 'PROFILE_SAVE_DAILY_LIMIT',
    kind: 'rateLimited',
    retryAfter: DAILY_LIMIT_RETRY_AFTER,
  },
  { status: STATUS_UNPROCESSABLE, code: 'MODERATION_REJECTED', kind: 'rejected' },
  { status: STATUS_BAD_REQUEST, code: 'INVALID_INPUT', kind: 'rejected' },
  { status: STATUS_UNAVAILABLE, code: 'CHECK_UNAVAILABLE', kind: 'unavailable' },
  { status: STATUS_FORBIDDEN, code: 'BANNED', kind: 'banned' },
];

describe('updateProfile', () => {
  // ME-08, FIRST-08, D-108, D-101: PATCH /api/profile with the ID token and a JSON body
  it('sends PATCH /api/profile with the ID token and the body as JSON', async () => {
    await updateProfile({ ...VALID, show_google_photo: true, accept_terms: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    expect(init?.method?.toUpperCase()).toBe('PATCH');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(headers.get('content-type')).toBe('application/json');
    expect(sentBody()).toEqual({ ...VALID, show_google_photo: true, accept_terms: true });
  });

  // FIRST-08, D-61, D-101: the text is trimmed and in NFC before it leaves, and a missing field is not invented
  it('sends the name and city trimmed and in NFC, and no field that was not given', async () => {
    await updateProfile({ display_name: '  Café  ', city_id: HAIFA_ID });
    expect(sentBody()).toEqual({ display_name: 'Café', city_id: HAIFA_ID });
  });

  // FIRST-08, D-117: the request carries city_id, a number, and no text city
  it('sends the city as city_id only', async () => {
    await updateProfile({ city_id: HAIFA_ID });
    expect(sentBody()).toEqual({ city_id: HAIFA_ID });
  });

  // FIRST-15, D-117, D-101: a code that cannot be a locality code is not sent
  it.each([
    ['zero', 0],
    ['a negative number', -1],
    ['a fraction', 1.5],
  ])('does not send a city_id of %s', async (_name, city_id) => {
    await expect(attempt({ city_id })).rejects.toBeInstanceOf(ZodError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ME-08, D-108: an edit never carries accept_terms unless the caller gave it
  it('sends no accept_terms when the caller gave none', async () => {
    await updateProfile({ ...VALID, show_google_photo: false });
    expect(sentBody()).toEqual({ ...VALID, show_google_photo: false });
  });

  // FIRST-08, D-101: the answer is the profile, parsed with the profile schema
  it('returns the parsed answer', async () => {
    const answer = { ...PROFILE, ...VALID, terms_accepted: true };
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, answer));
    await expect(updateProfile(VALID)).resolves.toEqual(answer);
  });

  // FIRST-08, D-101: an answer that is not a profile is a ZodError and never reaches a screen
  it.each([
    ['a wrong status', { ...PROFILE, status: 'deleted' }],
    ['a missing field', { display_name: 'x' }],
  ])('throws a ZodError for an answer with %s', async (_name, answer) => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, answer));
    await expect(updateProfile(VALID)).rejects.toBeInstanceOf(ZodError);
  });

  // FIRST-02, D-61, D-92, D-116: the body is checked by the schema; a text outside the length is not sent
  it.each([
    ['one under the minimum', PROFILE_NAME_MIN_LENGTH - 1, false],
    ['the minimum', PROFILE_NAME_MIN_LENGTH, true],
    ['the maximum', PROFILE_NAME_MAX_LENGTH, true],
    ['one over the maximum', PROFILE_NAME_MAX_LENGTH + 1, false],
  ])('a name of %s characters', async (_name, length, accepted) => {
    // 'dana' repeated: no letter three times in a row (D-116)
    const call = attempt({ display_name: 'dana'.repeat(length).slice(0, length) });
    if (accepted) {
      await call;
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } else {
      await expect(call).rejects.toBeInstanceOf(ZodError);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  // FIRST-14, PROF-32, D-116: the same names the server refuses are not sent; the others go with one space
  it.each([
    ['digits', 'Dana2'],
    ['an emoji', 'Dana 😀'],
    ['an underscore', 'Dana_Levi'],
    ['digits after a name', 'Dana Levi 99'],
    ['a letter three times, any case', 'Aaa Bbb'],
    ['a letter three times in the second word', 'Dana Lllevi'],
    ['only hyphens', '---'],
    ['a blocked word', 'Test'],
    ['a blocked word as the first word', 'admin cohen'],
    ['a blocked word in capitals', 'ADMIN'],
    ['a blocked word followed by a dot', 'Test.'],
    ['a blocked word, capitalised, followed by a dot', 'Admin.'],
    ['a blocked Hebrew word', 'בדיקה'],
    ['two braille letters', '\u{2801}\u{2803}'],
    ['a letter with Hangul fillers', 'D\u{3164}\u{3164}a'],
    ['a letter with a variation selector', 'Dana\u{FE0F}'],
  ])('does not send a name with %s', async (_name, display_name) => {
    await expect(attempt({ display_name })).rejects.toBeInstanceOf(ZodError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['two spaces turned into one', 'Dana  Levi', 'Dana Levi'],
    ['Hebrew', 'דנה לוי', 'דנה לוי'],
    ['Russian', 'Анна', 'Анна'],
    ['Arabic', 'سارة', 'سارة'],
    ['a hyphen', 'Tom-Ali', 'Tom-Ali'],
    ['an apostrophe', "D'Souza", "D'Souza"],
    ['dots', 'O.K. Lee', 'O.K. Lee'],
    ['a half-space', 'می\u{200C}خواهم', 'می\u{200C}خواهم'],
    ['a right-to-left mark', 'דנה\u{200F} לוי', 'דנה\u{200F} לוי'],
  ])('sends a name with %s', async (_name, display_name, sent) => {
    await attempt({ display_name });
    expect(sentBody()).toEqual({ display_name: sent });
  });

  // FIRST-14, D-116: every word of the constant is refused, in any case, but only as a whole word
  it.each([...PROFILE_NAME_BLOCKED_WORDS])(
    'does not send the blocked word %s, in capitals or after a name',
    async (word) => {
      for (const display_name of [
        word,
        word.toUpperCase(),
        `Dana ${word}`,
        `Dana-${word}`,
        `${word}.`,
      ]) {
        await expect(attempt({ display_name })).rejects.toBeInstanceOf(ZodError);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  // FIRST-02, D-61: a name with a newline is not sent
  it('does not send a name with a newline', async () => {
    await expect(attempt({ display_name: 'Dana\nLevi' })).rejects.toBeInstanceOf(ZodError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // FIRST-09, D-62, D-61, D-72, D-74, D-60: each refusal keeps its code and its kind
  it.each(REFUSALS)('$code', async ({ status, code, kind, retryAfter }) => {
    const headers: Record<string, string> =
      retryAfter === undefined ? {} : { 'retry-after': String(retryAfter) };
    fetchMock.mockResolvedValue(jsonResponse(status, { code }, headers));
    const error = await failureOf(updateProfile(VALID));
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw new Error('not an ApiError');
    expect(error.kind).toBe(kind);
    expect(error.code).toBe(code);
    expect(error.retryAfterSeconds).toBe(retryAfter);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('PROFILE_QUERY_KEY', () => {
  // SHELL-13, D-59: the one key the guard and the saves share, a list as TanStack Query wants
  it('is a non-empty list', () => {
    expect(Array.isArray(PROFILE_QUERY_KEY)).toBe(true);
    expect(PROFILE_QUERY_KEY.length).toBeGreaterThan(0);
  });
});
