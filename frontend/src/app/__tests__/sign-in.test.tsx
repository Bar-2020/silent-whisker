// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createInstance } from 'i18next';
import { ErrorResponse } from 'oidc-client-ts';
import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import {
  ACCESS_TOKEN,
  FAKE_COGNITO_DOMAIN,
  ID_TOKEN,
  jsonResponse,
  makeUser,
  OIDC_STORAGE_KEYS,
  PROFILE,
  seedSignInStorage,
  UNRELATED_STORAGE_KEY,
  UNRELATED_STORAGE_VALUE,
} from '@shared/test-support/sign-in-fakes';
import auth from '@constants/auth.json';
import { MS_PER_SECOND } from '@constants/cost';
import {
  API_PATH_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  STATUS_OK,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAUTHORIZED,
  STATUS_UNAVAILABLE,
} from '@constants/http';
import { LANGUAGES } from '@constants/languages';
import {
  AFTER_SIGN_IN_PATH,
  OIDC_STORAGE_PREFIX,
  SIGN_IN_IDENTITY_PROVIDER,
  SIGN_IN_LOOP_SECONDS,
  SIGN_IN_STARTED_STORAGE_KEY,
} from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const localeSchema = z.record(z.string(), z.string());

const here = dirname(fileURLToPath(import.meta.url));

const localeText = (code: string): string =>
  readFileSync(resolve(here, '../../../public/locales', `${code}.json`), 'utf8');

const locales = new Map<string, Record<string, string>>(
  LANGUAGES.map(({ code }) => [code, localeSchema.parse(JSON.parse(localeText(code)))])
);

const getLocale = (code: string): Record<string, string> => {
  const locale = locales.get(code);
  if (locale === undefined) throw new Error(`no locale ${code}`);
  return locale;
};

const text = (code: string, key: string): string => {
  const locale = getLocale(code);
  if (!Object.hasOwn(locale, key)) throw new Error(`${code}.json has no key ${key}`);
  return locale[key];
};

const CODES = LANGUAGES.map(({ code }) => code);
const EN = 'en';
const NOW = new Date('2026-11-14T10:00:00Z');
const ORIGIN = 'https://app.example.test';
const CALLBACK_PATH = auth.callback_path;
const GOOGLE = { identity_provider: SIGN_IN_IDENTITY_PROVIDER };

/** In-app pages a sign-in can come back to. */
const IN_APP_PAGES = ['/profile', '/spots/x', '/spots/x?a=1#h'];

/** What a return page must never be: the app sends these to AFTER_SIGN_IN_PATH instead. */
const NOT_IN_APP_PAGES: [string, unknown][] = [
  ['another site', 'https://evil.example'],
  ['a protocol-relative address', '//evil.example'],
  ['a backslash address', '/\\evil.example'],
  ['the callback itself', CALLBACK_PATH],
  ['no state', undefined],
];

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

/**
 * The callback page keeps its answer for the life of the page, so each test loads the app afresh,
 * as a new page load would. The fake is read back from the mocked seam: the one the app uses.
 */
let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;

beforeEach(async () => {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(STATUS_OK, PROFILE)));
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
  allTimersFaked = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Shows where the router is and how it got there (a replace is not a push). */
function Probe(): ReactElement {
  const location = useLocation();
  const type = useNavigationType();
  const label = `${location.pathname}${location.search}${location.hash}|${type}`;
  return <output data-testid="probe">{label}</output>;
}

/** A countdown needs the timers themselves faked; other tests fake the clock only. */
let allTimersFaked = false;

function fakeAllTimers(): void {
  vi.useRealTimers();
  vi.useFakeTimers({ now: NOW });
  allTimersFaked = true;
}

async function flush(): Promise<void> {
  await act(async () => {
    if (allTimersFaked) {
      await vi.advanceTimersByTimeAsync(0);
      return;
    }
    await new Promise((done) => {
      setTimeout(done, 0);
    });
  });
}

async function waitSeconds(seconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * MS_PER_SECOND);
  });
}

async function open(path: string, code = EN, strict = false): Promise<void> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: code,
    fallbackLng: false,
    resources: { [code]: { translation: getLocale(code) } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  const tree = (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <Probe />
      </MemoryRouter>
    </I18nextProvider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  await flush();
}

const probe = (): string => document.querySelector('[data-testid="probe"]')?.textContent ?? '';
const currentPath = (): string => probe().split('|')[0];
const h1 = (): string | null => document.querySelector('h1')?.textContent ?? null;
const button = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === label);
const signOutButton = (): HTMLButtonElement | undefined => button(text(EN, 'profile.signOut'));
const googleAt = (state: string): unknown[] => [{ state, extraQueryParams: GOOGLE }];

async function pressRetry(): Promise<void> {
  const retry = button(text(EN, 'common.retry'));
  expect(retry).toBeDefined();
  if (retry === undefined) return;
  fireEvent.click(retry);
  await flush();
}

/** The retry screen of a refused or looping sign-in (`states.signIn`, D-59, D-104). */
function expectSignInFailedScreen(code = EN): void {
  expect(h1()).toBe(text(code, 'states.signIn.title'));
  expect(document.body.textContent).toContain(text(code, 'states.signIn.text'));
  expect(button(text(code, 'common.retry'))).toBeDefined();
  expect(button(text(code, 'profile.signOut'))).toBeUndefined();
}

describe('the guard, signed out', () => {
  // SHELL-12, D-59: the first visit goes to Google and the page is kept as the return page
  it.each(['/profile', '/profile?tab=2#top', '/spots/x'])('sends %s to Google', async (path) => {
    await open(path);
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt(path));
  });

  // SHELL-12, D-59: nothing of the page shows while the visit leaves
  it('shows no page and no message while it leaves for Google', async () => {
    await open('/profile');
    expect(h1()).toBeNull();
    expect(signOutButton()).toBeUndefined();
    expect(button(text(EN, 'common.retry'))).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // SHELL-12, D-104: the start of a redirect is recorded, as the time in ms
  it('records the start of the redirect in sessionStorage', async () => {
    await open('/profile');
    expect(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY)).toBe(String(Date.now()));
  });

  // SHELL-12, D-59, D-104: sign-in came back and was refused: a second visit does not leave again
  it('shows a retry screen on the second visit and does not leave for Google again', async () => {
    await open('/profile?tab=2');
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    cleanup();
    vi.setSystemTime(Date.now() + MS_PER_SECOND);

    await open('/profile?tab=2');
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expectSignInFailedScreen();

    // the button starts the sign-in again, with the same return page
    await pressRetry();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(2);
    expect(fakeUserManager.signinRedirect.mock.calls[1]).toEqual(googleAt('/profile?tab=2'));
  });

  // SHELL-12, D-104: the window is SIGN_IN_LOOP_SECONDS: inside it a loop, from it on not
  it.each([
    ['one second inside the window', SIGN_IN_LOOP_SECONDS - 1, true],
    ['exactly the window', SIGN_IN_LOOP_SECONDS, false],
    ['one second past the window', SIGN_IN_LOOP_SECONDS + 1, false],
  ])('%s', async (_name, ageSeconds, isLoop) => {
    sessionStorage.setItem(
      SIGN_IN_STARTED_STORAGE_KEY,
      String(Date.now() - ageSeconds * MS_PER_SECOND)
    );
    await open('/profile');
    if (isLoop) {
      expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
      expectSignInFailedScreen();
    } else {
      expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
      expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt('/profile'));
      expect(h1()).toBeNull();
    }
  });

  // SHELL-12, D-59, D-104: the retry screen is in the visitor's language
  it.each(CODES)('shows the retry screen in %s', async (code) => {
    sessionStorage.setItem(SIGN_IN_STARTED_STORAGE_KEY, String(Date.now()));
    await open('/profile', code);
    expectSignInFailedScreen(code);
  });
});

describe('the guard, signed in', () => {
  beforeEach(() => {
    fakeUserManager.setUser(makeUser());
  });

  // SHELL-13, D-59: the page opens only once the profile has arrived, and the call carried the ID token
  it('opens the page only after GET /profile answers, with the ID token as a bearer', async () => {
    const answers: ((response: Response) => void)[] = [];
    const pending = new Promise<Response>((done) => {
      answers.push(done);
    });
    fetchMock.mockImplementation(() => pending);
    await open('/profile');
    expect(signOutButton()).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    for (const answer of answers) answer(jsonResponse(STATUS_OK, PROFILE));
    await flush();
    expect(signOutButton()).toBeDefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    const authorization = new Headers(init?.headers).get('authorization');
    expect(authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(authorization).not.toContain(ACCESS_TOKEN);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
  });

  // SHELL-13, D-59: the connection screen, its button asks again, and the page opens when it works
  it.each([
    ['a 503', () => Promise.resolve(jsonResponse(STATUS_UNAVAILABLE))],
    ['no connection', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('shows the connection screen after %s', async (_name, failure) => {
    fetchMock.mockImplementationOnce(failure);
    await open('/profile');
    expect(h1()).toBe(text(EN, 'states.error.title'));
    expect(document.body.textContent).toContain(text(EN, 'states.loadFailed.text'));
    expect(signOutButton()).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
    // SHELL-18: only a 429 holds the button back
    expect(button(text(EN, 'common.retry'))?.disabled).toBe(false);

    await pressRetry();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signOutButton()).toBeDefined();
    expect(h1()).not.toBe(text(EN, 'states.error.title'));
  });

  // SHELL-17, D-59: tab A signed out; tab B's next call sends nothing, and its guard goes to Google
  it('sends nothing and goes to Google when another tab signed out', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse(STATUS_UNAVAILABLE)));
    await open('/profile?tab=2');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();

    // tab A's sign-out emptied the shared storage; this tab's library was not told
    fakeUserManager.setUser(null);
    await pressRetry();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt('/profile?tab=2'));
  });

  // SHELL-13, D-59: while the answer is still a failure the page stays shut
  it('keeps the connection screen while the retry also fails', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(STATUS_UNAVAILABLE)));
    await open('/profile');
    await pressRetry();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(h1()).toBe(text(EN, 'states.error.title'));
    expect(signOutButton()).toBeUndefined();
  });

  // SHELL-13, R-36, D-59: a bare 401 ends the session: tokens removed, then Google, back to the same page
  it('removes the tokens and goes to Google after a bare 401', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(STATUS_UNAUTHORIZED)));
    await open('/profile');
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt('/profile'));
    expect(signOutButton()).toBeUndefined();
    expect(h1()).not.toBe(text(EN, 'states.error.title'));
  });
});

describe('the guard, signed in, too many requests', () => {
  const RETRY_AFTER = DEFAULT_RETRY_AFTER_SECONDS + 5;
  const rateLimitText = (code: string, seconds: number): string =>
    text(code, 'common.rateLimit.text').replace('{{n}}', String(seconds));

  const tooMany = (headers: Record<string, string> = {}): Promise<Response> =>
    Promise.resolve(jsonResponse(STATUS_TOO_MANY_REQUESTS, undefined, headers));

  beforeEach(() => {
    fakeUserManager.setUser(makeUser());
    fakeAllTimers();
  });

  // SHELL-18, D-60, R-21: the wait is Retry-After, else the default; the button is off until it has passed
  it.each([
    ['a bare 429', undefined, DEFAULT_RETRY_AFTER_SECONDS],
    ['a 429 with Retry-After', String(RETRY_AFTER), RETRY_AFTER],
  ])('shows the wait after %s, and its button waits', async (_name, header, seconds) => {
    const headers: Record<string, string> = header === undefined ? {} : { 'retry-after': header };
    fetchMock.mockImplementationOnce(() => tooMany(headers));
    await open('/profile');
    expect(h1()).toBe(text(EN, 'common.rateLimit.title'));
    expect(document.body.textContent).toContain(rateLimitText(EN, seconds));
    expect(signOutButton()).toBeUndefined();
    expect(button(text(EN, 'common.retry'))?.disabled).toBe(true);

    await waitSeconds(seconds - 1);
    expect(button(text(EN, 'common.retry'))?.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await waitSeconds(1);
    expect(button(text(EN, 'common.retry'))?.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await pressRetry();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_PATH_PREFIX}/profile`);
    expect(signOutButton()).toBeDefined();
  });

  // SHELL-18, D-60: no sign-in is started and no token is removed for a 429
  it('keeps the member signed in', async () => {
    fetchMock.mockImplementationOnce(() => tooMany());
    await open('/profile');
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
  });

  // SHELL-18: the screen is in the member's language and the text carries the number
  it.each(CODES)('has its words in %s', async (code) => {
    expect(text(code, 'common.rateLimit.text')).toContain('{{n}}');
    fetchMock.mockImplementationOnce(() => tooMany());
    await open('/profile', code);
    expect(h1()).toBe(text(code, 'common.rateLimit.title'));
    expect(document.body.textContent).toContain(rateLimitText(code, DEFAULT_RETRY_AFTER_SECONDS));
  });
});

describe('a sign-in redirect that cannot start', () => {
  // SHELL-19, D-59: the guard shows the sign-in-failed screen, and its button tries again
  it('shows the sign-in-failed screen on a guarded page, and its button tries again', async () => {
    fakeUserManager.signinRedirect.mockRejectedValue(new Error('cannot reach Google'));
    await open('/profile?tab=2');
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expectSignInFailedScreen();

    await pressRetry();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(2);
    expect(fakeUserManager.signinRedirect.mock.calls[1]).toEqual(googleAt('/profile?tab=2'));
    expectSignInFailedScreen();
  });
});

describe('sign-out', () => {
  async function pressSignOut(): Promise<void> {
    fakeUserManager.setUser(makeUser());
    await open('/profile');
    const out = signOutButton();
    expect(out).toBeDefined();
    if (out === undefined) return;
    seedSignInStorage();
    fireEvent.click(out);
    await flush();
  }

  // SHELL-14, D-59, R-22: every oidc.* key and the sign-in marker are gone, nothing else is touched
  it('empties the sign-in records from both storages and keeps unrelated keys', async () => {
    await pressSignOut();
    const left = Object.keys(localStorage).filter((key) => key.startsWith(OIDC_STORAGE_PREFIX));
    expect(left).toEqual([]);
    expect(OIDC_STORAGE_KEYS.filter((key) => localStorage.getItem(key) !== null)).toEqual([]);
    expect(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(UNRELATED_STORAGE_KEY)).toBe(UNRELATED_STORAGE_VALUE);
  });

  // SHELL-14, D-59, R-22: tokens gone, then the visit goes to Cognito's /logout with the app's own address
  it('removes the tokens and goes to Cognito /logout', async () => {
    await pressSignOut();
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    const url = new URL(replace.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(`${FAKE_COGNITO_DOMAIN}/logout`);
    expect(url.searchParams.get('client_id')).toBe(auth.client_id);
    expect(url.searchParams.get('logout_uri')).toBe(`${ORIGIN}/`);
  });

  // SHELL-14, D-59: the guard hears the tokens go, but a member who pressed Sign out is not sent to Google
  it('does not start a Google sign-in on its way out', async () => {
    await pressSignOut();
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
  });
});

describe('the callback page, a good code', () => {
  const goodCode = (state: unknown): void => {
    const user = makeUser({ state });
    fakeUserManager.signinRedirectCallback.mockImplementation(() => {
      fakeUserManager.setUser(user);
      return Promise.resolve(user);
    });
  };

  // SHELL-15, D-59: back to the page kept in the sign-in request, replacing the callback
  it.each(IN_APP_PAGES)('returns to %s', async (path) => {
    goodCode(path);
    await open(CALLBACK_PATH);
    expect(probe()).toBe(`${path}|REPLACE`);
    expect(fakeUserManager.signinRedirectCallback).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
  });

  // SHELL-15, D-59: a return page that is not a page of the app is never followed
  it.each([
    ...NOT_IN_APP_PAGES,
    ['an empty state', ''],
    ['a state that is not text', 5],
    ['a null state', null],
  ])('with %s goes to AFTER_SIGN_IN_PATH', async (_name, state) => {
    goodCode(state);
    await open(CALLBACK_PATH);
    expect(probe()).toBe(`${AFTER_SIGN_IN_PATH}|REPLACE`);
    expect(replace).not.toHaveBeenCalled();
  });

  // SHELL-15, D-59: the library is asked once, even when React runs the effect twice
  it('reads the sign-in answer once under React StrictMode', async () => {
    goodCode('/spots/x');
    await open(CALLBACK_PATH, EN, true);
    expect(fakeUserManager.signinRedirectCallback).toHaveBeenCalledTimes(1);
    expect(currentPath()).toBe('/spots/x');
  });
});

describe('the callback page, a refusal', () => {
  const REFUSALS: [string, Error][] = [
    ['access_denied', new ErrorResponse({ error: 'access_denied' })],
    ['a wrong state', new Error('No matching state found in storage')],
    ['a reused code', new ErrorResponse({ error: 'invalid_grant' })],
    ['no parameters', new Error('No state in response')],
  ];

  // SHELL-15, D-59, D-104: a retry screen, and no sign-in starts by itself
  it.each(REFUSALS)('shows the retry screen for %s', async (_name, error) => {
    fakeUserManager.signinRedirectCallback.mockRejectedValue(error);
    await open(CALLBACK_PATH);
    expectSignInFailedScreen();
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(currentPath()).toBe(CALLBACK_PATH);
  });

  // SHELL-15, D-59, D-104: a good code the browser cannot keep is a failed sign-in
  it('shows the retry screen for a good code when the browser keeps no tokens', async () => {
    fakeUserManager.signinRedirectCallback.mockResolvedValue(makeUser({ state: '/spots/x' }));
    fakeUserManager.getUser.mockResolvedValue(null);
    await open(CALLBACK_PATH);
    expectSignInFailedScreen();
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(currentPath()).toBe(CALLBACK_PATH);
  });

  // SHELL-15, D-59: the retry screen is in the visitor's language
  it.each(CODES)('shows the retry screen in %s', async (code) => {
    fakeUserManager.signinRedirectCallback.mockRejectedValue(
      new ErrorResponse({ error: 'access_denied' })
    );
    await open(CALLBACK_PATH, code);
    expectSignInFailedScreen(code);
  });

  // SHELL-15, D-59: the retry button starts the sign-in, with the page the refused request carried
  it.each(IN_APP_PAGES)('the retry button returns to %s', async (userState) => {
    fakeUserManager.signinRedirectCallback.mockRejectedValue(
      new ErrorResponse({ error: 'access_denied', userState })
    );
    await open(CALLBACK_PATH);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    await pressRetry();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt(userState));
  });

  // SHELL-15, D-59: a carried page that is not in the app is not followed either
  it.each(NOT_IN_APP_PAGES)('the retry button with %s goes on', async (_name, state) => {
    fakeUserManager.signinRedirectCallback.mockRejectedValue(
      new ErrorResponse({ error: 'access_denied', userState: state })
    );
    await open(CALLBACK_PATH);
    await pressRetry();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt(AFTER_SIGN_IN_PATH));
  });

  // SHELL-15, D-59: an error that carries no page restarts at AFTER_SIGN_IN_PATH
  it('the retry button after a wrong state goes to AFTER_SIGN_IN_PATH', async () => {
    fakeUserManager.signinRedirectCallback.mockRejectedValue(
      new Error('No matching state found in storage')
    );
    await open(CALLBACK_PATH);
    await pressRetry();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual(googleAt(AFTER_SIGN_IN_PATH));
  });
});
