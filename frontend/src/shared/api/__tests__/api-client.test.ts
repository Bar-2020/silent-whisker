// @vitest-environment jsdom
import { ErrorResponse } from 'oidc-client-ts';
import { z, ZodError } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ApiError } from '@shared/api/api-error';
import { apiRequest } from '@shared/api/api-client';
import { getProfile } from '@shared/api/profile-api';
import {
  ACCESS_TOKEN,
  fakeUserManager,
  ID_TOKEN,
  jsonResponse,
  makeUser,
  PROFILE,
  stubNavigatorLocks,
  unstubNavigatorLocks,
} from '@shared/test-support/sign-in-fakes';
import {
  API_PATH_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  STATUS_BAD_REQUEST,
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_SERVER_ERROR,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAUTHORIZED,
  STATUS_UNAVAILABLE,
  STATUS_UNPROCESSABLE,
} from '@constants/http';
import { TOKEN_REFRESH_MARGIN_SECONDS } from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: FAKE_COGNITO_DOMAIN };
});

const STATUS_BAD_GATEWAY = STATUS_SERVER_ERROR + 2;
const STATUS_LAST_SERVER_ERROR = STATUS_SERVER_ERROR + 99;
const STATUS_LAST_CLIENT_ERROR = STATUS_SERVER_ERROR - 1;
const RETRY_AFTER = DEFAULT_RETRY_AFTER_SECONDS + 5;

const answerSchema = z.object({ value: z.string() });

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fakeUserManager.reset();
  fakeUserManager.setUser(makeUser());
  stubNavigatorLocks();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, { value: 'ok' }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  unstubNavigatorLocks();
});

async function failureOf(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
  } catch (error) {
    return error;
  }
  throw new Error('the call did not fail');
}

async function apiError(): Promise<ApiError> {
  const error = await failureOf(apiRequest('/thing', answerSchema));
  expect(error).toBeInstanceOf(ApiError);
  if (!(error instanceof ApiError)) throw new Error('not an ApiError');
  return error;
}

interface Case {
  name: string;
  status: number;
  code?: string;
  kind: ApiError['kind'];
  tokensRemoved: boolean;
}

const CASES: Case[] = [
  // the sign-in ended
  { name: 'bare 401', status: STATUS_UNAUTHORIZED, kind: 'sessionExpired', tokensRemoved: true },
  {
    name: '401 UNAUTHORIZED',
    status: STATUS_UNAUTHORIZED,
    code: 'UNAUTHORIZED',
    kind: 'sessionExpired',
    tokensRemoved: true,
  },
  {
    name: 'UNAUTHORIZED under another status (400)',
    status: STATUS_BAD_REQUEST,
    code: 'UNAUTHORIZED',
    kind: 'sessionExpired',
    tokensRemoved: true,
  },
  {
    name: 'UNAUTHORIZED under 403 beats the plain 403 rule',
    status: STATUS_FORBIDDEN,
    code: 'UNAUTHORIZED',
    kind: 'sessionExpired',
    tokensRemoved: true,
  },
  // FORBIDDEN is checked first, under any status, and the tokens stay
  {
    name: '403 FORBIDDEN',
    status: STATUS_FORBIDDEN,
    code: 'FORBIDDEN',
    kind: 'forbidden',
    tokensRemoved: false,
  },
  { name: 'bare 403', status: STATUS_FORBIDDEN, kind: 'forbidden', tokensRemoved: false },
  {
    name: '401 FORBIDDEN',
    status: STATUS_UNAUTHORIZED,
    code: 'FORBIDDEN',
    kind: 'forbidden',
    tokensRemoved: false,
  },
  {
    name: '429 FORBIDDEN',
    status: STATUS_TOO_MANY_REQUESTS,
    code: 'FORBIDDEN',
    kind: 'forbidden',
    tokensRemoved: false,
  },
  {
    name: '503 FORBIDDEN',
    status: STATUS_UNAVAILABLE,
    code: 'FORBIDDEN',
    kind: 'forbidden',
    tokensRemoved: false,
  },
  // banned and terms
  {
    name: '403 BANNED',
    status: STATUS_FORBIDDEN,
    code: 'BANNED',
    kind: 'banned',
    tokensRemoved: false,
  },
  {
    name: '401 BANNED',
    status: STATUS_UNAUTHORIZED,
    code: 'BANNED',
    kind: 'banned',
    tokensRemoved: false,
  },
  {
    name: '429 BANNED',
    status: STATUS_TOO_MANY_REQUESTS,
    code: 'BANNED',
    kind: 'banned',
    tokensRemoved: false,
  },
  {
    name: '403 TERMS_REQUIRED',
    status: STATUS_FORBIDDEN,
    code: 'TERMS_REQUIRED',
    kind: 'termsRequired',
    tokensRemoved: false,
  },
  // the server could not do it, whatever its code
  {
    name: 'bare 503',
    status: STATUS_UNAVAILABLE,
    kind: 'unavailable',
    tokensRemoved: false,
  },
  {
    name: 'first server status (500) keeps its code',
    status: STATUS_SERVER_ERROR,
    code: 'INTERNAL',
    kind: 'unavailable',
    tokensRemoved: false,
  },
  {
    name: '502',
    status: STATUS_BAD_GATEWAY,
    kind: 'unavailable',
    tokensRemoved: false,
  },
  {
    name: 'last server status keeps its code',
    status: STATUS_LAST_SERVER_ERROR,
    code: 'SOMETHING_ELSE',
    kind: 'unavailable',
    tokensRemoved: false,
  },
  // anything else the server refused
  {
    name: 'one below the server statuses is rejected',
    status: STATUS_LAST_CLIENT_ERROR,
    kind: 'rejected',
    tokensRemoved: false,
  },
  {
    name: '400 with a code keeps the code',
    status: STATUS_BAD_REQUEST,
    code: 'INVALID_INPUT',
    kind: 'rejected',
    tokensRemoved: false,
  },
  { name: '404', status: STATUS_NOT_FOUND, kind: 'rejected', tokensRemoved: false },
  {
    name: '422 with a code keeps the code',
    status: STATUS_UNPROCESSABLE,
    code: 'TEXT_REJECTED',
    kind: 'rejected',
    tokensRemoved: false,
  },
];

describe('apiRequest maps every failure to one kind', () => {
  // SHELL-06, R-36, D-60, D-72
  it.each(CASES)('$name', async ({ status, code, kind, tokensRemoved }) => {
    fetchMock.mockResolvedValue(jsonResponse(status, code === undefined ? undefined : { code }));
    const error = await apiError();
    expect(error.kind).toBe(kind);
    expect(error.code).toBe(code);
    expect(error.retryAfterSeconds).toBeUndefined();
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(tokensRemoved ? 1 : 0);
  });

  // SHELL-06, D-60: a gateway page that is not JSON is still "unavailable"
  it('treats a 5xx answer whose body is not JSON as unavailable', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>Bad gateway</html>', { status: STATUS_BAD_GATEWAY })
    );
    const error = await apiError();
    expect(error.kind).toBe('unavailable');
    expect(error.code).toBeUndefined();
  });

  // SHELL-06: a 401 with an empty or odd body still ends the session
  it('treats a 401 whose body is not JSON as a session that ended', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: STATUS_UNAUTHORIZED }));
    const error = await apiError();
    expect(error.kind).toBe('sessionExpired');
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
  });

  // SHELL-06, D-60: no connection is "unavailable", and nothing is queued or retried
  it('treats a fetch that throws (no connection) as unavailable, once', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await apiError();
    expect(error.kind).toBe('unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
  });
});

describe('apiRequest and 429', () => {
  const WAITS: [string, string | undefined, number][] = [
    ['no header', undefined, DEFAULT_RETRY_AFTER_SECONDS],
    ['a positive whole number', String(RETRY_AFTER), RETRY_AFTER],
    ['one second', '1', 1],
    ['zero', '0', DEFAULT_RETRY_AFTER_SECONDS],
    ['a negative number', `${-1}`, DEFAULT_RETRY_AFTER_SECONDS],
    ['an empty value', '', DEFAULT_RETRY_AFTER_SECONDS],
    ['a word', 'soon', DEFAULT_RETRY_AFTER_SECONDS],
    ['a fraction', `${RETRY_AFTER}.5`, DEFAULT_RETRY_AFTER_SECONDS],
    ['a number with a unit', `${RETRY_AFTER}s`, DEFAULT_RETRY_AFTER_SECONDS],
    ['an HTTP date', 'Wed, 21 Oct 2026 07:28:00 GMT', DEFAULT_RETRY_AFTER_SECONDS],
  ];
  const BODIES: [string, { code: string } | undefined][] = [
    ['bare', undefined],
    ['RATE_LIMITED', { code: 'RATE_LIMITED' }],
    ['another code', { code: 'SOMETHING_ELSE' }],
  ];

  // SHELL-06, R-21, D-60: the wait is Retry-After when it is a positive whole number, else the default
  describe.each(BODIES)('a %s 429', (_name, body) => {
    it.each(WAITS)('with Retry-After: %s', async (_label, header, seconds) => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          STATUS_TOO_MANY_REQUESTS,
          body,
          header === undefined ? {} : { 'retry-after': header }
        )
      );
      const error = await apiError();
      expect(error.kind).toBe('rateLimited');
      expect(error.retryAfterSeconds).toBe(seconds);
      expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
    });
  });

  // SHELL-06, D-60: the app does not retry or queue by itself
  it('is asked once and not again', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(STATUS_TOO_MANY_REQUESTS, undefined, { 'retry-after': '1' })
    );
    await apiError();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // SHELL-06: Retry-After means nothing on another failure
  it('ignores Retry-After on a 503', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(STATUS_UNAVAILABLE, undefined, { 'retry-after': String(RETRY_AFTER) })
    );
    const error = await apiError();
    expect(error.kind).toBe('unavailable');
    expect(error.retryAfterSeconds).toBeUndefined();
  });
});

describe('apiRequest without a usable sign-in', () => {
  // SHELL-06, SHELL-13, D-59: no signed-in user: no call leaves the browser
  it('is a session that ended, with no fetch at all, when nobody is signed in', async () => {
    fakeUserManager.setUser(null);
    const error = await apiError();
    expect(error.kind).toBe('sessionExpired');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // SHELL-06, SHELL-16, D-59: a refused refresh ends the session before any call is made
  it('is a session that ended, with no fetch, when the refresh token is refused', async () => {
    stubNavigatorLocks();
    fakeUserManager.setUser(makeUser({ secondsLeft: TOKEN_REFRESH_MARGIN_SECONDS - 1 }));
    fakeUserManager.signinSilent.mockRejectedValue(new ErrorResponse({ error: 'invalid_grant' }));
    const error = await apiError();
    expect(error.kind).toBe('sessionExpired');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).toHaveBeenCalled();
  });
});

describe('apiRequest on success', () => {
  // SHELL-13, D-59, D-101: GET under /api with the ID token, never the access token
  it('calls the path under /api with the ID token as a bearer', async () => {
    const result = await apiRequest('/thing', answerSchema);
    expect(result).toEqual({ value: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_PATH_PREFIX}/thing`);
    expect((init?.method ?? 'GET').toUpperCase()).toBe('GET');
    const authorization = new Headers(init?.headers).get('authorization');
    expect(authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(authorization).not.toContain(ACCESS_TOKEN);
  });

  // SHELL-13, D-101: an answer that does not fit the schema is a ZodError, not an API failure
  it.each([
    ['a missing field', {}],
    ['a wrong type', { value: 5 }],
  ])('throws a ZodError for 200 with %s', async (_name, body) => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, body));
    const error = await failureOf(apiRequest('/thing', answerSchema));
    expect(error).toBeInstanceOf(ZodError);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  // SHELL-13, D-59, D-101: the profile call is GET /api/profile and its answer is parsed
  it('getProfile asks /api/profile and returns the parsed profile', async () => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, PROFILE));
    await expect(getProfile()).resolves.toEqual(PROFILE);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_PATH_PREFIX}/profile`);
  });

  // SHELL-13, D-101: a profile with a wrong field never reaches a screen
  it('getProfile throws a ZodError for a profile with a wrong status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK, { ...PROFILE, status: 'deleted' }));
    await expect(getProfile()).rejects.toBeInstanceOf(ZodError);
  });
});
