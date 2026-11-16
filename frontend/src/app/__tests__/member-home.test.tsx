// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import {
  installBrowserLocation,
  restoreBrowserLocation,
} from '@shared/test-support/geolocation-fakes';
import { ENGLISH_CODE, getLocaleText, LANGUAGE_CODES } from '@shared/test-support/locale-texts';
import { HAIFA_ID, pickCity } from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import {
  readCurrentPath,
  ROUTER_LOCATION_PROBE_TEST_ID,
} from '@shared/test-support/router-location';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import {
  INSTALL_STEP_DONE_STORAGE_KEY,
  LOCATION_STEP_DONE_STORAGE_KEY,
} from '@constants/first-run';
import { API_PATH_PREFIX, STATUS_OK } from '@constants/http';
import { AUTH_CALLBACK_PATH, HOME_PATH, MEMBER_HOME_PATH, PROFILE_PATH } from '@constants/routes';
import { AFTER_SIGN_IN_PATH, SIGN_IN_IDENTITY_PROVIDER } from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';
/** The three sections of the landing page the top bar links to: nothing else has these ids. */
const LANDING_SECTIONS = '[id="how-h"], [id="privacy-h"], [id="free-h"]';
const GOOGLE = { identity_provider: SIGN_IN_IDENTITY_PROVIDER };

const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);

const MEMBER: ProfileResponse = { ...PROFILE, display_name: 'Dana Levi', city_id: HAIFA_ID };
const NEW_MEMBER: ProfileResponse = {
  ...MEMBER,
  display_name: null,
  city_id: null,
  terms_accepted: false,
};

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;
let profile: ProfileResponse;
let landingDrawn: boolean;
let observer: MutationObserver;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

/** A new page load: the modules are read afresh, as a closed and reopened tab would. */
async function loadApp(): Promise<void> {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
}

/** True once any node added to the page held a section of the landing page, even for a moment. */
function noteLanding(records: MutationRecord[]): void {
  for (const record of records) {
    for (const node of Array.from(record.addedNodes)) {
      if (
        node instanceof Element &&
        (node.matches(LANDING_SECTIONS) || node.querySelector(LANDING_SECTIONS) !== null)
      ) {
        landingDrawn = true;
      }
    }
  }
}

function wasLandingDrawn(): boolean {
  noteLanding(observer.takeRecords());
  return landingDrawn;
}

beforeEach(async () => {
  await loadApp();
  sessionStorage.clear();
  localStorage.clear();
  // FIRST-11, FIRST-12, D-110, D-111: without the flags the first-run steps take the place of the page
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
  profile = MEMBER;
  fetchMock.mockReset();
  fetchMock.mockImplementation((_url, init) => {
    if ((init?.method ?? 'GET').toUpperCase() === 'PATCH') {
      profile = MEMBER;
      return Promise.resolve(jsonResponse(STATUS_OK, MEMBER));
    }
    return Promise.resolve(jsonResponse(STATUS_OK, profile));
  });
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
  landingDrawn = false;
  observer = new MutationObserver(noteLanding);
  observer.observe(document.body, { childList: true, subtree: true });
});

afterEach(() => {
  observer.disconnect();
  cleanup();
  restoreBrowserLocation();
  vi.unstubAllGlobals();
});

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;
const probe = (): string =>
  document.querySelector(`[data-testid="${ROUTER_LOCATION_PROBE_TEST_ID}"]`)?.textContent ?? '';
const apiCalls = (): string[] =>
  fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith(API_PATH_PREFIX));
const landingSections = (): number => document.querySelectorAll(LANDING_SECTIONS).length;
const landingSignInButtons = (code = ENGLISH_CODE): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('button')).filter((node) =>
    [text('landing.signIn', code), text('landing.signInShort', code)].includes(
      node.textContent.trim()
    )
  );
const buttonWords = (): string[] =>
  Array.from(document.querySelectorAll('button'))
    .map((node) => node.textContent.trim())
    .filter((label) => label !== '');

async function visit(path: string, code = ENGLISH_CODE): Promise<void> {
  await renderAppAtPath(<App />, path, code);
  await settleScreen();
}

async function open(
  path: string,
  code = ENGLISH_CODE,
  member: ProfileResponse = MEMBER
): Promise<void> {
  profile = member;
  fakeUserManager.setUser(makeUser());
  await visit(path, code);
}

async function press(label: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: label }));
  await settleScreen();
}

function expectMemberHome(code = ENGLISH_CODE): void {
  expect(heading1()).toBe(text('home.title', code));
  expect(readCurrentPath()).toBe(MEMBER_HOME_PATH);
}

describe('the landing page for a signed-in visit', () => {
  const VISITS: [string, () => ReturnType<typeof makeUser>][] = [
    ['tokens stored', () => makeUser()],
    ['an expired ID token', () => makeUser({ secondsLeft: -1 })],
  ];

  // SHELL-24, D-114, D-39: a member goes to /home, replacing the entry, and the landing page is never drawn
  it.each(VISITS)('goes to /home and never draws the landing page: %s', async (_name, user) => {
    fakeUserManager.setUser(user());
    await visit(HOME_PATH);
    expect(readCurrentPath()).toBe(MEMBER_HOME_PATH);
    // the entry of "/" was replaced, so Back does not return to it
    expect(probe()).toBe(`${MEMBER_HOME_PATH}|REPLACE`);
    expect(wasLandingDrawn()).toBe(false);
    expect(landingSections()).toBe(0);
    expect(landingSignInButtons()).toEqual([]);
  });

  // SHELL-24, D-114: the same in every language
  it.each(LANGUAGE_CODES)('goes to /home in %s', async (code) => {
    fakeUserManager.setUser(makeUser());
    await visit(HOME_PATH, code);
    expect(wasLandingDrawn()).toBe(false);
    expectMemberHome(code);
  });
});

describe('the landing page for a signed-out visit', () => {
  // SHELL-24, D-114, D-39: the landing page, with no call to /api/ and no redirect
  it('shows the landing page with no call to /api/ and no redirect', async () => {
    await visit(HOME_PATH);
    expect(landingSections()).toBe(LANDING_SECTIONS.split(',').length);
    expect(landingSignInButtons().length).toBeGreaterThan(0);
    expect(readCurrentPath()).toBe(HOME_PATH);
    expect(probe()).not.toContain('REPLACE');
    expect(apiCalls()).toEqual([]);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(heading1()).not.toBe(text('home.title'));
  });
});

describe('the cat icon', () => {
  const catIcon = (code = ENGLISH_CODE): HTMLElement =>
    screen.getByRole('link', { name: text('nav.home', code) });

  // SHELL-24, D-114: from Profile and from the home screen the icon ends on /home, never on the landing page
  it.each([PROFILE_PATH, MEMBER_HOME_PATH])('leads to /home from %s', async (path) => {
    await open(path);
    expect(catIcon().getAttribute('href')).toBe(HOME_PATH);
    fireEvent.click(catIcon());
    await settleScreen();
    expectMemberHome();
    expect(wasLandingDrawn()).toBe(false);
    expect(landingSections()).toBe(0);
  });

  // SHELL-24, D-114: the icon is named in every language
  it.each(LANGUAGE_CODES)('is named and leads home in %s', async (code) => {
    await open(PROFILE_PATH, code);
    expect(catIcon(code).getAttribute('href')).toBe(HOME_PATH);
    fireEvent.click(catIcon(code));
    await settleScreen();
    expectMemberHome(code);
    expect(wasLandingDrawn()).toBe(false);
  });
});

describe('a sign-in with no page to return to', () => {
  const goodCode = (state: unknown): void => {
    const user = makeUser({ state });
    fakeUserManager.signinRedirectCallback.mockImplementation(() => {
      fakeUserManager.setUser(user);
      return Promise.resolve(user);
    });
  };

  // SHELL-24, D-114: the default landing place is the member's home, not Profile
  it('lands at /home by constant', () => {
    expect(AFTER_SIGN_IN_PATH).toBe(MEMBER_HOME_PATH);
    expect(AFTER_SIGN_IN_PATH).not.toBe(PROFILE_PATH);
    expect(MEMBER_HOME_PATH).not.toBe(HOME_PATH);
  });

  // SHELL-24, D-114: with no return page stored the callback replaces itself with /home, and /home shows
  it.each([
    ['no state', undefined],
    ['a null state', null],
    ['an empty state', ''],
    ['a state that is not a page of the app', 'https://evil.example'],
  ])('lands at /home with %s', async (_name, state) => {
    goodCode(state);
    await visit(AUTH_CALLBACK_PATH);
    expect(probe()).toBe(`${MEMBER_HOME_PATH}|REPLACE`);
    expect(heading1()).toBe(text('home.title'));
    expect(wasLandingDrawn()).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  // SHELL-24, D-114, D-59: a return page that was stored is still followed
  it('still returns to the stored page', async () => {
    goodCode(PROFILE_PATH);
    await visit(AUTH_CALLBACK_PATH);
    expect(probe()).toBe(`${PROFILE_PATH}|REPLACE`);
    expect(heading1()).toBe(text('profile.heading'));
  });
});

describe('/home behind the guards', () => {
  // SHELL-24, D-114, SHELL-12: signed out goes to Google with /home as the return page
  it('sends a signed-out visit to Google with /home as the return page', async () => {
    await visit(MEMBER_HOME_PATH);
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual([
      { state: MEMBER_HOME_PATH, extraQueryParams: GOOGLE },
    ]);
    expect(heading1()).toBeNull();
    expect(apiCalls()).toEqual([]);
    expect(wasLandingDrawn()).toBe(false);
  });

  // SHELL-24, D-114, D-108: terms not accepted: the sign-up form takes the place of the home screen
  it('shows the sign-up form, not the home screen, while the terms are not accepted', async () => {
    await open(MEMBER_HOME_PATH, ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));
    expect(document.body.textContent).not.toContain(text('home.title'));
    expect(readCurrentPath()).toBe(MEMBER_HOME_PATH);
  });

  // SHELL-24, D-114, D-108, D-110, D-111: the sign-up form, then install, then location, then the home screen
  it('puts the sign-up form, the install step and the location step before the home screen', async () => {
    localStorage.clear();
    installBrowserLocation({ permission: 'prompt', geolocation: true });
    await open(MEMBER_HOME_PATH, ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));

    fireEvent.change(screen.getByRole('textbox', { name: text('firstrun.name.label') }), {
      target: { value: 'Dana Cohen' },
    });
    await pickCity('Haifa', 'Haifa');
    fireEvent.click(screen.getByRole('checkbox'));
    await press(text('common.continue'));
    expect(heading1()).toBe(text('firstrun.install.h1'));
    expect(readCurrentPath()).toBe(MEMBER_HOME_PATH);

    await press(text('common.continue'));
    expect(heading1()).toBe(text('firstrun.location.h1'));
    expect(readCurrentPath()).toBe(MEMBER_HOME_PATH);

    await press(text('firstrun.location.skip'));
    expectMemberHome();
    expect(wasLandingDrawn()).toBe(false);
  });

  // SHELL-24, D-114, D-110: with the terms accepted but no flags, the install step shows first
  it('shows the install step before the home screen when its flag is missing', async () => {
    localStorage.removeItem(INSTALL_STEP_DONE_STORAGE_KEY);
    await open(MEMBER_HOME_PATH);
    expect(heading1()).toBe(text('firstrun.install.h1'));
    await press(text('common.continue'));
    expectMemberHome();
  });

  // SHELL-24, D-114, D-111: and the location step after it
  it('shows the location step before the home screen when its flag is missing', async () => {
    localStorage.removeItem(LOCATION_STEP_DONE_STORAGE_KEY);
    installBrowserLocation({ permission: 'prompt', geolocation: true });
    await open(MEMBER_HOME_PATH);
    expect(heading1()).toBe(text('firstrun.location.h1'));
    await press(text('firstrun.location.skip'));
    expectMemberHome();
  });
});

describe('the home screen', () => {
  // SHELL-24, D-114: one heading for screen readers, the tab title, and nothing else drawn
  it.each(LANGUAGE_CODES)('has one heading and nothing else in %s', async (code) => {
    await open(MEMBER_HOME_PATH, code);
    expectMemberHome(code);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll(HEADINGS)).toHaveLength(1);
    expect(document.title).toBe(`${text('home.title', code)} | ${text('app.name', code)}`);

    // no landing text, no profile text, no controls beside the shell's icons
    expect(landingSections()).toBe(0);
    expect(landingSignInButtons(code)).toEqual([]);
    expect(document.body.textContent).not.toContain(text('profile.heading', code));
    expect(document.body.textContent).not.toContain(text('profile.signOut', code));
    expect(buttonWords()).toEqual([]);
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
  });
});
