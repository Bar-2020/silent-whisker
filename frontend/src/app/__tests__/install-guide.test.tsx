// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { ENGLISH_CODE, getLocaleText, LANGUAGE_CODES } from '@shared/test-support/locale-texts';
import { HAIFA_ID, pickCity } from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { readCurrentPath } from '@shared/test-support/router-location';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import { FIRST_RUN_STORAGE_PREFIX, INSTALL_STEP_DONE_STORAGE_KEY } from '@constants/first-run';
import { STATUS_OK } from '@constants/http';
import { SIGN_IN_IDENTITY_PROVIDER } from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const INSTALL_PATH = '/profile/install';

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

let restoreBrowser: () => void = () => undefined;

beforeEach(async () => {
  await loadApp();
  sessionStorage.clear();
  localStorage.clear();
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
});

afterEach(() => {
  cleanup();
  restoreBrowser();
  restoreBrowser = () => undefined;
  vi.unstubAllGlobals();
});

// ---- the browser the page is read in

/** jsdom has no `navigator.maxTouchPoints`: it is defined for the test and deleted after it. */
function useBrowser(userAgent: string, touchPoints: number): void {
  const spy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true });
  restoreBrowser = () => {
    spy.mockRestore();
    Reflect.deleteProperty(navigator, 'maxTouchPoints');
  };
}

const IPHONE_GUIDE = 0;
const ANDROID_GUIDE = 1;
const COMPUTER_GUIDE = 2;
const MAC_GUIDE = 3;

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/126.0.0.0`;
const CHROME_LINUX =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_MAC = IPAD_AS_MAC;
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';
const OPERA = `${CHROME_WINDOWS} OPR/111.0.0.0`;

const NO_TOUCH = 0;
const ONE_TOUCH_POINT = 1;
const IPAD_TOUCH_POINTS = 5;

/** The browser, its user agent, its touch points, and the guide that must be the open one (none: all closed). */
const BROWSERS: [string, string, number, number | null][] = [
  ['an iPhone', IPHONE, IPAD_TOUCH_POINTS, IPHONE_GUIDE],
  ['Chrome on an iPhone', IPHONE_CHROME, IPAD_TOUCH_POINTS, IPHONE_GUIDE],
  ['an iPad that reports itself as a Mac', IPAD_AS_MAC, IPAD_TOUCH_POINTS, IPHONE_GUIDE],
  ['an Android phone', ANDROID, IPAD_TOUCH_POINTS, ANDROID_GUIDE],
  ['Chrome on Windows', CHROME_WINDOWS, NO_TOUCH, COMPUTER_GUIDE],
  ['Edge on Windows', EDGE_WINDOWS, NO_TOUCH, COMPUTER_GUIDE],
  ['Chrome on Linux', CHROME_LINUX, NO_TOUCH, COMPUTER_GUIDE],
  ['Chrome on a Mac with no touch screen', CHROME_MAC, NO_TOUCH, COMPUTER_GUIDE],
  ['Safari on a Mac with no touch screen', SAFARI_MAC, NO_TOUCH, MAC_GUIDE],
  ['Safari on a Mac with one touch point', SAFARI_MAC, ONE_TOUCH_POINT, MAC_GUIDE],
  ['Firefox', FIREFOX, NO_TOUCH, null],
  ['Opera', OPERA, NO_TOUCH, null],
];

// ---- the screen

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;
const detailsElements = (): HTMLDetailsElement[] =>
  Array.from(document.querySelectorAll('details'));
const openFlags = (): boolean[] => detailsElements().map((element) => element.open);
const continueButton = (): HTMLElement | null =>
  screen.queryByRole('button', { name: text('common.continue') });
const firstRunKeys = (): string[] =>
  Object.keys(localStorage).filter((key) => key.startsWith(FIRST_RUN_STORAGE_PREFIX));
const isDone = (): boolean => localStorage.getItem(INSTALL_STEP_DONE_STORAGE_KEY) !== null;
const markDone = (): void => {
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
};
const paragraphs = (): string[] =>
  Array.from(document.querySelectorAll('p')).map((node) => node.textContent.trim());
const pageHas = (key: string, code = ENGLISH_CODE): boolean =>
  document.body.textContent.includes(text(key, code));

/** The four guides, in this order, with the number of steps each has. */
const GUIDES: [string, number][] = [
  ['iphone', 3],
  ['android', 3],
  ['chrome', 2],
  ['safari', 2],
];

function expectFourGuides(code = ENGLISH_CODE): void {
  const found = detailsElements();
  expect(found).toHaveLength(GUIDES.length);
  GUIDES.forEach(([name, steps], index) => {
    expect(found[index].querySelector('summary')?.textContent.trim()).toBe(
      text(`profile.install.${name}`, code)
    );
    const items = Array.from(found[index].querySelectorAll('ol > li')).map((item) =>
      item.textContent.trim()
    );
    const expected = Array.from({ length: steps }, (_, step) =>
      text(`profile.install.${name}${step + 1}`, code)
    );
    expect(items).toEqual(expected);
  });
}

/** Only the guide at `index` is open; with `null` all four are closed. */
const expectOpenGuide = (index: number | null): void => {
  expect(openFlags()).toEqual(GUIDES.map((_, position) => position === index));
};

function expectInstallStep(code = ENGLISH_CODE): void {
  expect(heading1()).toBe(text('firstrun.install.h1', code));
  expect(screen.getByRole('button', { name: text('common.continue', code) })).toBeDefined();
}

function expectNotInstallStep(): void {
  expect(heading1()).not.toBe(text('firstrun.install.h1'));
  expect(continueButton()).toBeNull();
}

async function open(
  path = '/profile',
  code = ENGLISH_CODE,
  member: ProfileResponse = MEMBER
): Promise<void> {
  profile = member;
  fakeUserManager.setUser(makeUser());
  await renderAppAtPath(<App />, path, code);
  await settleScreen();
}

/** Close the tab and open the page again: no memory of the first load but the browser's storage. */
async function reopen(path = '/profile'): Promise<void> {
  cleanup();
  await loadApp();
  await open(path);
}

async function pressContinue(): Promise<void> {
  const found = continueButton();
  if (found === null) throw new Error('there is no Continue button');
  fireEvent.click(found);
  await settleScreen();
}

// ---- FIRST-11

describe('the install step, what it shows', () => {
  // FIRST-11, D-01, D-110: the heading, the lead, the four guides in order, one Continue and the line about later
  it('shows the heading, the lead, the four guides, the later line and one Continue button', async () => {
    await open();
    expectInstallStep();
    expect(paragraphs()).toContain(text('firstrun.install.lead'));
    expectFourGuides();
    expect(pageHas('firstrun.install.later')).toBe(true);
    // the shell's icon-only language button is not part of the screen
    const words = screen
      .getAllByRole('button')
      .map((node) => node.textContent.trim())
      .filter((label) => label !== '');
    expect(words).toEqual([text('common.continue')]);
    expect(readCurrentPath()).toBe('/profile');
  });

  // FIRST-11, D-110: the member is never asked whether the app is installed
  it('asks no question about whether the app is installed', async () => {
    await open();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  // FIRST-11, D-110: the step has no Back link and not the note of the Profile page
  it('has no Back link and no note about the account', async () => {
    await open();
    expect(screen.queryByRole('link', { name: text('common.back') })).toBeNull();
    expect(pageHas('profile.install.note')).toBe(false);
  });

  // FIRST-11, D-01, D-110: no browser is told from another by anything but the user agent and the touch screen
  it.each(BROWSERS)('opens only the right guide for %s', async (_name, agent, touch, guide) => {
    useBrowser(agent, touch);
    await open();
    expectFourGuides();
    expectOpenGuide(guide);
  });

  // FIRST-11, D-110: every language has the step, the four guides and their steps
  it.each(LANGUAGE_CODES)('is in %s', async (code) => {
    await open('/profile', code);
    expectInstallStep(code);
    expect(paragraphs()).toContain(text('firstrun.install.lead', code));
    expectFourGuides(code);
    expect(pageHas('firstrun.install.later', code)).toBe(true);
    expect(screen.getByRole('button', { name: text('common.continue', code) })).toBeDefined();
  });
});

describe('the install step, before and after Continue', () => {
  // FIRST-11, D-110: nothing is stored until Continue
  it('stores nothing before Continue', async () => {
    await open();
    expectInstallStep();
    expect(isDone()).toBe(false);
    expect(firstRunKeys()).toEqual([]);
  });

  // FIRST-11, D-110: closing the tab at the step and opening the page again shows the step again
  it('shows the step again when the page is opened again before Continue', async () => {
    await open();
    await reopen();
    expectInstallStep();
    expect(isDone()).toBe(false);
    expect(firstRunKeys()).toEqual([]);
  });

  // FIRST-11, D-110: Continue stores the flag and shows the page that was asked for, at the same address
  it('stores the flag on Continue and shows the Profile page at the address asked for', async () => {
    await open('/profile');
    await pressContinue();
    expect(isDone()).toBe(true);
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
    expect(heading1()).toBe(text('profile.heading'));
    expect(continueButton()).toBeNull();
    expect(detailsElements()).toHaveLength(0);
    expect(readCurrentPath()).toBe('/profile');
  });

  // FIRST-11, D-110: a later visit does not show the step
  it('is not shown on a later visit once Continue was pressed', async () => {
    await open();
    await pressContinue();
    await reopen();
    expectNotInstallStep();
    expect(heading1()).toBe(text('profile.heading'));
    expect(detailsElements()).toHaveLength(0);
  });

  // FIRST-11, D-110: Continue is not a sign-out and not a page load: the member stays in the app
  it('does not send the member anywhere else on Continue', async () => {
    await open('/profile');
    await pressContinue();
    expect(replace).not.toHaveBeenCalled();
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
  });

  // FIRST-11, D-110: the step takes the place of every page under the gate, and the address stays
  it.each([
    ['/profile', text('profile.heading')],
    [INSTALL_PATH, text('profile.install.title')],
    ['/nowhere/at/all', null],
  ])('takes the place of the page at %s, then gives it back', async (path, ownHeading) => {
    await open(path);
    expectInstallStep();
    expect(readCurrentPath()).toBe(path);
    expect(isDone()).toBe(false);

    await pressContinue();
    expect(isDone()).toBe(true);
    expect(readCurrentPath()).toBe(path);
    expectNotInstallStep();
    if (ownHeading !== null) expect(heading1()).toBe(ownHeading);
  });

  // FIRST-11, D-110: the flag is only the key's presence: a member with it never sees the step at any page
  it.each(['/profile', INSTALL_PATH, '/nowhere/at/all'])(
    'is not shown at %s when the flag is set',
    async (path) => {
      markDone();
      await open(path);
      expectNotInstallStep();
      expect(readCurrentPath()).toBe(path);
    }
  );
});

describe('the install step, in the first run', () => {
  const nameField = (): HTMLElement =>
    screen.getByRole('textbox', { name: text('firstrun.name.label') });

  // FIRST-11, FIRST-07, D-110, D-108: a member who has not accepted the terms sees the sign-up form, not the step
  it('is not shown while the terms are not accepted: the sign-up form comes first', async () => {
    await open('/profile', ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));
    expect(detailsElements()).toHaveLength(0);
    expect(heading1()).not.toBe(text('firstrun.install.h1'));
    expect(isDone()).toBe(false);
  });

  // FIRST-11, D-110: once the sign-up form is saved the install step comes next, and only Continue shows the page
  it('comes after the sign-up form, and Continue then shows the page', async () => {
    await open('/profile', ENGLISH_CODE, NEW_MEMBER);
    fireEvent.change(nameField(), { target: { value: 'Dana Cohen' } });
    await pickCity('Haifa', 'Haifa');
    fireEvent.click(screen.getByRole('checkbox'));
    await pressContinue();

    expectInstallStep();
    expectFourGuides();
    expect(isDone()).toBe(false);
    expect(readCurrentPath()).toBe('/profile');

    await pressContinue();
    expect(isDone()).toBe(true);
    expect(heading1()).toBe(text('profile.heading'));
  });
});

// ---- ME-14

const SETTINGS = 'profile.settings.title';
const ROW = 'profile.settings.install';
const ROW_HINT = 'profile.settings.installHint';

/** The row is one button whose name holds the row's words and its hint line. */
function installRow(): HTMLElement {
  const settings = screen.getByRole('region', { name: text(SETTINGS) });
  return within(settings).getByRole('button', {
    name: (name) => name.includes(text(ROW)) && name.includes(text(ROW_HINT)),
  });
}

const backLink = (code = ENGLISH_CODE): HTMLElement =>
  screen.getByRole('link', { name: text('common.back', code) });

function expectGuidePage(code = ENGLISH_CODE): void {
  expect(heading1()).toBe(text('profile.install.title', code));
  expect(paragraphs()).toContain(text('profile.install.lead', code));
  expect(backLink(code).getAttribute('href')).toBe('/profile');
  expectFourGuides(code);
  expect(pageHas('profile.install.note', code)).toBe(true);
  expect(screen.queryByRole('button', { name: text('common.continue', code) })).toBeNull();
}

describe('the Install as an app row of Profile', () => {
  beforeEach(markDone);

  // ME-14, D-01, D-110: the row sits in the Settings section and carries its hint line
  it('sits in the Settings section, with its hint line inside the button', async () => {
    await open('/profile');
    expect(heading1()).toBe(text('profile.heading'));
    expect(installRow()).toBeDefined();
  });

  // ME-14, D-01, D-110: the row opens the guide in the app, with no reload and no request
  it('opens the guide page in the app, with no page load and no new request', async () => {
    await open('/profile');
    const requests = fetchMock.mock.calls.length;
    fireEvent.click(installRow());
    await settleScreen();

    expect(readCurrentPath()).toBe(INSTALL_PATH);
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls).toHaveLength(requests);
    expectGuidePage();
    expect(detailsElements().filter((element) => element.open)).toHaveLength(0);
  });

  // ME-14, D-110: Back returns to Profile, in the app too
  it('returns to Profile with the Back link', async () => {
    await open('/profile');
    fireEvent.click(installRow());
    await settleScreen();
    fireEvent.click(backLink());
    await settleScreen();

    expect(readCurrentPath()).toBe('/profile');
    expect(heading1()).toBe(text('profile.heading'));
    expect(detailsElements()).toHaveLength(0);
    expect(replace).not.toHaveBeenCalled();
    expect(installRow()).toBeDefined();
  });

  // ME-14, D-110: the row and the page are in every language
  it.each(LANGUAGE_CODES)('and the guide page are in %s', async (code) => {
    await open('/profile', code);
    const settings = screen.getByRole('region', { name: text(SETTINGS, code) });
    const row = within(settings).getByRole('button', {
      name: (name) => name.includes(text(ROW, code)) && name.includes(text(ROW_HINT, code)),
    });
    fireEvent.click(row);
    await settleScreen();
    expect(readCurrentPath()).toBe(INSTALL_PATH);
    expectGuidePage(code);
  });
});

describe('the install guide page', () => {
  beforeEach(markDone);

  // ME-14, D-01, D-110: opened by its address, the page has the title, the back link, the guides and the note
  it('has the title, the lead, the Back link, the four guides and the note, and no Continue', async () => {
    await open(INSTALL_PATH);
    expect(readCurrentPath()).toBe(INSTALL_PATH);
    expectGuidePage();
    expect(heading1()).not.toBe(text('firstrun.install.h1'));
  });

  // ME-14, D-01, D-110: the detected guide is open, the others closed, as in the first-run step
  it.each(BROWSERS)('opens only the right guide for %s', async (_name, agent, touch, guide) => {
    useBrowser(agent, touch);
    await open(INSTALL_PATH);
    expectFourGuides();
    expectOpenGuide(guide);
  });

  // ME-14, D-110: the guide does not change anything in the account
  it('sends no write request and sets no flag', async () => {
    await open(INSTALL_PATH);
    const writes = fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? 'GET').toUpperCase() !== 'GET'
    );
    expect(writes).toEqual([]);
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
  });
});

describe('the install guide page, behind the guards', () => {
  const GOOGLE = { identity_provider: SIGN_IN_IDENTITY_PROVIDER };

  // ME-14, SHELL-12, D-110: a signed-out visit goes to Google and comes back to this page
  it.each([true, false])(
    'sends a signed-out visit to Google, with the flag set: %s',
    async (flagSet) => {
      if (flagSet) markDone();
      await renderAppAtPath(<App />, INSTALL_PATH);
      await settleScreen();
      expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
      expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual([
        { state: INSTALL_PATH, extraQueryParams: GOOGLE },
      ]);
      expect(heading1()).toBeNull();
      expect(detailsElements()).toHaveLength(0);
    }
  );

  // ME-14, R-36, D-108, D-110: a member who has not accepted the terms sees the sign-up form, not the guide
  it('shows an unaccepted member the sign-up form, not the guide', async () => {
    markDone();
    await open(INSTALL_PATH, ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));
    expect(readCurrentPath()).toBe(INSTALL_PATH);
    expect(detailsElements()).toHaveLength(0);
    expect(pageHas('profile.install.note')).toBe(false);
  });

  // ME-14, D-110: with the first run not finished, the install step comes first, and Continue then opens the guide
  it('shows the install step first when the first run is not finished', async () => {
    await open(INSTALL_PATH);
    expectInstallStep();
    expect(readCurrentPath()).toBe(INSTALL_PATH);
    expect(pageHas('profile.install.note')).toBe(false);
    expect(screen.queryByRole('link', { name: text('common.back') })).toBeNull();

    await pressContinue();
    expectGuidePage();
    expect(readCurrentPath()).toBe(INSTALL_PATH);
  });
});
