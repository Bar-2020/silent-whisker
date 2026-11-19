// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import type {
  BrowserLocation,
  BrowserLocationOptions,
  PermissionAnswer,
} from '@shared/test-support/geolocation-fakes';
import {
  installBrowserLocation,
  restoreBrowserLocation,
} from '@shared/test-support/geolocation-fakes';
import { ENGLISH_CODE, getLocaleText, LANGUAGE_CODES } from '@shared/test-support/locale-texts';
import { answerCityFile } from '@shared/test-support/city-files-fake';
import { HAIFA_ID } from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { readCurrentPath } from '@shared/test-support/router-location';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import {
  FIRST_RUN_STORAGE_PREFIX,
  INSTALL_STEP_DONE_STORAGE_KEY,
  LOCATION_STEP_DONE_STORAGE_KEY,
} from '@constants/first-run';
import { STATUS_OK } from '@constants/http';
import { SIGN_IN_IDENTITY_PROVIDER } from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const LOCATION_PATH = '/profile/location';

const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);

const MEMBER: ProfileResponse = {
  ...PROFILE,
  display_name: 'Dana Levi',
  city_id: HAIFA_ID,
  terms_accepted: true,
};
const NEW_MEMBER: ProfileResponse = {
  ...MEMBER,
  display_name: null,
  city_id: null,
  terms_accepted: false,
};

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;
let profile: ProfileResponse;
let browser: BrowserLocation;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

let restoreUserAgent: () => void = () => undefined;

/** What the browser says about location: the Permissions API and whether `geolocation` exists. */
const withState = (permission: PermissionAnswer | null): BrowserLocationOptions => ({
  permission,
  geolocation: true,
});

beforeEach(async () => {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.clear();
  // FIRST-11, FIRST-12, D-110, D-111: without the two flags the first-run steps take the place of every page
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
  browser = installBrowserLocation(withState('prompt'));
  profile = MEMBER;
  fetchMock.mockReset();
  fetchMock.mockImplementation((url) =>
    Promise.resolve(answerCityFile(url) ?? jsonResponse(STATUS_OK, profile))
  );
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
});

afterEach(() => {
  cleanup();
  restoreBrowserLocation();
  restoreUserAgent();
  restoreUserAgent = () => undefined;
  vi.unstubAllGlobals();
});

// ---- the browser the page is read in

/** jsdom has no `navigator.maxTouchPoints`: it is defined for the test and deleted after it. */
function useBrowser(userAgent: string, touchPoints: number): void {
  const spy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true });
  restoreUserAgent = () => {
    spy.mockRestore();
    Reflect.deleteProperty(navigator, 'maxTouchPoints');
  };
}

const ANDROID_PART = 0;
const IPHONE_PART = 1;
const CHROME_PART = 2;
const EDGE_PART = 3;
const FIREFOX_PART = 4;
const SAFARI_PART = 5;

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/126.0.0.0`;
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';
const OPERA = `${CHROME_WINDOWS} OPR/111.0.0.0`;

const NO_TOUCH = 0;
const PHONE_TOUCH_POINTS = 5;

/** The browser, its user agent, its touch points, and the part that must be the open one (none: all closed). */
const BROWSERS: [string, string, number, number | null][] = [
  ['an iPhone', IPHONE, PHONE_TOUCH_POINTS, IPHONE_PART],
  ['an Android phone', ANDROID, PHONE_TOUCH_POINTS, ANDROID_PART],
  ['Chrome on Windows', CHROME_WINDOWS, NO_TOUCH, CHROME_PART],
  ['Edge on Windows', EDGE_WINDOWS, NO_TOUCH, EDGE_PART],
  ['Firefox', FIREFOX, NO_TOUCH, FIREFOX_PART],
  ['Safari on a Mac with no touch screen', SAFARI_MAC, NO_TOUCH, SAFARI_PART],
  ['Opera', OPERA, NO_TOUCH, null],
];

// ---- the screen

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;
const detailsElements = (): HTMLDetailsElement[] =>
  Array.from(document.querySelectorAll('details'));
const openFlags = (): boolean[] => detailsElements().map((element) => element.open);
const pageHas = (key: string, code = ENGLISH_CODE): boolean =>
  document.body.textContent.includes(text(key, code));
const firstRunKeys = (): string[] =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(FIRST_RUN_STORAGE_PREFIX))
    .sort();
const writeRequests = (): unknown[] =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET').toUpperCase() !== 'GET');

const backLink = (code = ENGLISH_CODE): HTMLElement =>
  screen.getByRole('link', { name: text('common.back', code) });
const turnOnButton = (code = ENGLISH_CODE): HTMLElement | null =>
  screen.queryByRole('button', { name: text('firstrun.location.allow', code) });
const stepsHeading = (code = ENGLISH_CODE): HTMLElement | null =>
  screen.queryByRole('heading', { level: 2, name: text('profile.location.stepsTitle', code) });

function mustFind(found: HTMLElement | null, what: string): HTMLElement {
  if (found === null) throw new Error(`there is no ${what}`);
  return found;
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

/** Browser with the given location state, then the help page. */
async function openHelp(options: BrowserLocationOptions, code = ENGLISH_CODE): Promise<void> {
  browser = installBrowserLocation(options);
  await open(LOCATION_PATH, code);
}

// ---- the states and the words they show

type State = 'granted' | 'denied' | 'notAsked' | 'unknown';

const STATES: [State, BrowserLocationOptions][] = [
  ['granted', withState('granted')],
  ['denied', withState('denied')],
  ['notAsked', withState('prompt')],
  ['unknown', withState(null)],
];

const STATE_KEYS: Record<Exclude<State, 'unknown'>, string[]> = {
  granted: ['profile.location.grantedTitle', 'profile.location.grantedText'],
  denied: ['profile.location.deniedTitle', 'profile.location.deniedText'],
  notAsked: ['profile.location.notAskedTitle', 'profile.location.notAskedText'],
};

const ALL_STATE_KEYS = Object.values(STATE_KEYS).flat();

/** The state in words: its own title and text, and none of the other states' (unless that text sits inside its own). */
function expectState(state: State, code = ENGLISH_CODE): void {
  const shown = state === 'unknown' ? [] : STATE_KEYS[state];
  for (const key of shown) expect(pageHas(key, code)).toBe(true);
  const shownTexts = shown.map((key) => text(key, code));
  const others = ALL_STATE_KEYS.filter(
    (key) => !shown.includes(key) && !shownTexts.some((words) => words.includes(text(key, code)))
  );
  for (const key of others) expect(pageHas(key, code)).toBe(false);
}

const SIX_PARTS = ['android', 'iphone', 'chrome', 'edge', 'firefox', 'safari'];

function expectSixParts(code = ENGLISH_CODE): void {
  expect(stepsHeading(code)).not.toBeNull();
  const found = detailsElements();
  expect(found).toHaveLength(SIX_PARTS.length);
  SIX_PARTS.forEach((name, index) => {
    expect(found[index].querySelector('summary')?.textContent.trim()).toBe(
      text(`profile.location.${name}`, code)
    );
  });
}

function expectNoParts(): void {
  expect(stepsHeading()).toBeNull();
  expect(detailsElements()).toHaveLength(0);
}

function expectHelpPage(code = ENGLISH_CODE): void {
  expect(heading1()).toBe(text('profile.location.title', code));
  expect(backLink(code).getAttribute('href')).toBe('/profile');
  expect(pageHas('profile.location.without', code)).toBe(true);
}

// ---- the Location row of Profile

const SETTINGS = 'profile.settings.title';
const ROW = 'profile.settings.location';

function locationRow(code = ENGLISH_CODE): HTMLElement {
  const settings = screen.getByRole('region', { name: text(SETTINGS, code) });
  return within(settings).getByRole('button', { name: (name) => name.includes(text(ROW, code)) });
}

/** The chip is a small element in the row whose own words are On or Off (it may hold an icon too). */
function chipsOf(row: HTMLElement, code = ENGLISH_CODE): string[] {
  const words = [text('profile.location.on', code), text('profile.location.off', code)];
  return [row, ...Array.from(row.querySelectorAll('*'))]
    .map((node) =>
      Array.from(node.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => (child.textContent ?? '').trim())
        .join('')
    )
    .filter((word) => words.includes(word));
}

describe('the Location row of Profile', () => {
  // ME-15, D-31, D-111: an On chip when granted, an Off chip when refused or not asked, none without the Permissions API
  it.each<[string, BrowserLocationOptions, string[]]>([
    ['granted', withState('granted'), [text('profile.location.on')]],
    ['refused', withState('denied'), [text('profile.location.off')]],
    ['not yet asked', withState('prompt'), [text('profile.location.off')]],
    ['without the Permissions API', withState(null), []],
  ])('carries the right chip when the browser is %s', async (_name, options, chips) => {
    browser = installBrowserLocation(options);
    await open('/profile');
    expect(heading1()).toBe(text('profile.heading'));
    expect(chipsOf(locationRow())).toEqual(chips);
  });

  // ME-15, D-111: no Permissions API and no geolocation: still no chip
  it('shows no chip when there is no Permissions API and no geolocation', async () => {
    browser = installBrowserLocation({ permission: null, geolocation: false });
    await open('/profile');
    expect(chipsOf(locationRow())).toEqual([]);
  });

  // ME-15, D-111: the row sits in the Settings section before the Install row
  it('sits in the Settings section before the Install row', async () => {
    await open('/profile');
    const settings = screen.getByRole('region', { name: text(SETTINGS) });
    const install = within(settings).getByRole('button', {
      name: (name) => name.includes(text('profile.settings.install')),
    });
    const row = locationRow();
    expect(row.compareDocumentPosition(install) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // ME-15, D-111: the row opens the help page in the app, with no reload and no new request, and asks nothing
  it('opens the help page in the app, with no page load and no new request', async () => {
    await open('/profile');
    const requests = fetchMock.mock.calls.length;
    fireEvent.click(locationRow());
    await settleScreen();

    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expect(replace).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls).toHaveLength(requests);
    expectHelpPage();
    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
  });

  // ME-15, D-111: Back returns to Profile, in the app too
  it('returns to Profile with the Back link', async () => {
    await open('/profile');
    fireEvent.click(locationRow());
    await settleScreen();
    fireEvent.click(backLink());
    await settleScreen();

    expect(readCurrentPath()).toBe('/profile');
    expect(heading1()).toBe(text('profile.heading'));
    expect(detailsElements()).toHaveLength(0);
    expect(replace).not.toHaveBeenCalled();
    expect(locationRow()).toBeDefined();
  });

  // ME-15, D-111: a position given on the help page shows as an On chip on Profile after Back
  it('shows the chip of the new answer after going to the help page and back', async () => {
    await open('/profile');
    fireEvent.click(locationRow());
    await settleScreen();
    fireEvent.click(mustFind(turnOnButton(), 'Turn on button'));
    await settleScreen();
    browser.answerWithPosition();
    await settleScreen();
    fireEvent.click(backLink());
    await settleScreen();
    expect(chipsOf(locationRow())).toEqual([text('profile.location.on')]);
  });
});

// ---- the help page

describe('the location help page, the state in words', () => {
  // ME-15, D-31, D-111: the title, the back button and the state in words; nothing about the state when the browser cannot tell
  it.each(STATES)('has the title, the Back link and the words for %s', async (state, options) => {
    await openHelp(options);
    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expectHelpPage();
    expectState(state);
  });

  // ME-15, D-111: the page only reads the state; it asks nothing and writes nothing
  it.each(STATES)(
    'asks the browser for no position when opened for %s',
    async (_state, options) => {
      await openHelp(options);
      expect(browser.getCurrentPosition).not.toHaveBeenCalled();
      expect(writeRequests()).toEqual([]);
      expect(firstRunKeys()).toEqual(
        [INSTALL_STEP_DONE_STORAGE_KEY, LOCATION_STEP_DONE_STORAGE_KEY].sort()
      );
    }
  );

  // ME-15, D-31, D-111: the permission is read through the Permissions API, for geolocation
  it('asks the Permissions API about geolocation', async () => {
    await openHelp(withState('granted'));
    expect(browser.query).toHaveBeenCalled();
    expect(
      browser.query.mock.calls.every(([descriptor]) => descriptor.name === 'geolocation')
    ).toBe(true);
  });
});

describe('the Turn on button of the location help page', () => {
  // ME-15, D-111: shown when the browser has not been asked yet or cannot tell; never when it has granted or refused
  it.each<[string, BrowserLocationOptions, boolean]>([
    ['has not been asked', withState('prompt'), true],
    ['has no Permissions API', withState(null), true],
    ['has granted', withState('granted'), false],
    ['has refused', withState('denied'), false],
  ])('when the browser %s, is shown: %s', async (_name, options, shown) => {
    await openHelp(options);
    expect(turnOnButton() !== null).toBe(shown);
  });

  // ME-15, D-111: never when the browser has no geolocation, whatever the Permissions API says
  it.each<[string, PermissionAnswer | null]>([
    ['has not been asked', 'prompt'],
    ['has no Permissions API', null],
    ['has granted', 'granted'],
    ['has refused', 'denied'],
  ])('is not shown when the browser has no geolocation and %s', async (_name, permission) => {
    await openHelp({ permission, geolocation: false });
    expect(heading1()).toBe(text('profile.location.title'));
    expect(turnOnButton()).toBeNull();
  });

  // ME-15, D-111: it asks the browser once, for a precise position, and is disabled while the prompt is open
  it('asks the browser once for a precise position and is disabled while the prompt is open', async () => {
    await openHelp(withState('prompt'));
    const button = mustFind(turnOnButton(), 'Turn on button');
    fireEvent.click(button);
    await settleScreen();

    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    const [, , options] = browser.getCurrentPosition.mock.calls[0];
    expect(options?.enableHighAccuracy).toBe(true);
    expect(typeof options?.timeout).toBe('number');
    expect(button.hasAttribute('disabled')).toBe(true);

    fireEvent.click(button);
    await settleScreen();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(browser.openPrompts()).toBe(1);
  });

  // ME-15, D-111: a position: the state is read again and shows On, and the button goes
  it('refreshes the state after a position, and the button goes', async () => {
    await openHelp(withState('prompt'));
    expectState('notAsked');
    fireEvent.click(mustFind(turnOnButton(), 'Turn on button'));
    await settleScreen();
    browser.answerWithPosition();
    await settleScreen();

    expectState('granted');
    expect(turnOnButton()).toBeNull();
    expectSixParts();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(writeRequests()).toEqual([]);
  });

  // ME-15, D-31, D-111: a refusal: the state is read again and shows Off, and the button goes
  it('refreshes the state after a refusal, and the button goes', async () => {
    await openHelp(withState('prompt'));
    fireEvent.click(mustFind(turnOnButton(), 'Turn on button'));
    await settleScreen();
    browser.answerWithRefusal();
    await settleScreen();

    expectState('denied');
    expect(turnOnButton()).toBeNull();
    expectSixParts();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  // ME-15, D-111: a prompt nobody answers leaves the state as it was and the button disabled
  it('keeps the state and the disabled button while the prompt is not answered', async () => {
    await openHelp(withState('prompt'));
    const button = mustFind(turnOnButton(), 'Turn on button');
    fireEvent.click(button);
    await settleScreen();
    await settleScreen();
    expectState('notAsked');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  // ME-15, D-111: with no Permissions API the answer cannot change the words, and the button can be used again
  it.each(['position', 'refusal'] as const)(
    'gives the button back after a %s when the browser cannot tell',
    async (how) => {
      await openHelp(withState(null));
      const button = mustFind(turnOnButton(), 'Turn on button');
      fireEvent.click(button);
      await settleScreen();
      expect(button.hasAttribute('disabled')).toBe(true);

      if (how === 'position') browser.answerWithPosition();
      else browser.answerWithRefusal();
      await settleScreen();
      expectState('unknown');
      expect(mustFind(turnOnButton(), 'Turn on button').hasAttribute('disabled')).toBe(false);
      expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    }
  );

  // ME-15, D-111: the page does not set or clear any first-run flag
  it('stores no first-run flag', async () => {
    await openHelp(withState('prompt'));
    fireEvent.click(mustFind(turnOnButton(), 'Turn on button'));
    await settleScreen();
    browser.answerWithPosition();
    await settleScreen();
    expect(firstRunKeys()).toEqual(
      [INSTALL_STEP_DONE_STORAGE_KEY, LOCATION_STEP_DONE_STORAGE_KEY].sort()
    );
  });
});

describe('the six parts of the location help page', () => {
  // ME-15, D-111: six parts in this order when the state is not "not asked yet"; closed for a browser we cannot detect
  it.each(STATES.filter(([state]) => state !== 'notAsked'))(
    'has the six parts when the browser is %s',
    async (_state, options) => {
      await openHelp(options);
      expectSixParts();
    }
  );

  // ME-15, D-111: before the browser has been asked there is nothing to turn back on: no parts
  it('has no parts while the browser has not been asked yet', async () => {
    await openHelp(withState('prompt'));
    expectNoParts();
  });

  // ME-15, D-31, D-111: only the detected browser's part is open; for another browser all six are closed
  it.each(BROWSERS)('opens only the right part for %s', async (_name, agent, touch, part) => {
    useBrowser(agent, touch);
    await openHelp(withState('denied'));
    expectSixParts();
    expect(openFlags()).toEqual(SIX_PARTS.map((_, index) => index === part));
  });

  // ME-15, ME-06, D-31, D-111: each part opens when its summary is pressed
  it.each(SIX_PARTS.map((name, index) => [name, index] as const))(
    'opens the %s part',
    async (_name, index) => {
      await openHelp(withState('denied'));
      const summary = mustFind(detailsElements()[index].querySelector('summary'), 'summary');
      fireEvent.click(summary);
      await settleScreen();
      expect(detailsElements()[index].open).toBe(true);
    }
  );

  // ME-15, D-111: opening a part does not ask the browser or change the state
  it('changes nothing in the browser or the account when parts are opened', async () => {
    await openHelp(withState('denied'));
    for (const element of detailsElements()) {
      const summary = element.querySelector('summary');
      if (summary !== null) fireEvent.click(summary);
    }
    await settleScreen();
    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
    expect(writeRequests()).toEqual([]);
    expectState('denied');
  });
});

describe('the location help page, in every language', () => {
  // ME-15, A11Y-05, D-111: the row, the page, the state, the parts and the button are in every language
  it.each(LANGUAGE_CODES)('is in %s', async (code) => {
    browser = installBrowserLocation(withState('denied'));
    await open('/profile', code);
    fireEvent.click(locationRow(code));
    await settleScreen();
    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expectHelpPage(code);
    expectState('denied', code);
    expectSixParts(code);
  });

  it.each(LANGUAGE_CODES)('has the Turn on button in %s when not asked', async (code) => {
    await openHelp(withState('prompt'), code);
    expect(turnOnButton(code)).not.toBeNull();
    expectState('notAsked', code);
  });
});

// ---- behind the guards

describe('the location help page, behind the guards', () => {
  const GOOGLE = { identity_provider: SIGN_IN_IDENTITY_PROVIDER };

  // ME-15, SHELL-12, D-111: a signed-out visit goes to Google and comes back to this page
  it('sends a signed-out visit to Google', async () => {
    await renderAppAtPath(<App />, LOCATION_PATH);
    await settleScreen();
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect.mock.calls[0]).toEqual([
      { state: LOCATION_PATH, extraQueryParams: GOOGLE },
    ]);
    expect(heading1()).toBeNull();
    expect(detailsElements()).toHaveLength(0);
  });

  // ME-15, R-36, D-108, D-111: a member who has not accepted the terms sees the sign-up form, not the help page
  it('shows an unaccepted member the sign-up form, not the help page', async () => {
    browser = installBrowserLocation(withState('denied'));
    await open(LOCATION_PATH, ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));
    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expect(detailsElements()).toHaveLength(0);
    expect(pageHas('profile.location.without')).toBe(false);
  });

  // ME-15, D-110, D-111: with neither step finished the install step comes first, then the location step, then the page
  it('shows the first-run steps first when they are not finished', async () => {
    localStorage.removeItem(INSTALL_STEP_DONE_STORAGE_KEY);
    localStorage.removeItem(LOCATION_STEP_DONE_STORAGE_KEY);
    await open(LOCATION_PATH);
    expect(heading1()).toBe(text('firstrun.install.h1'));
    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expect(screen.queryByRole('link', { name: text('common.back') })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: text('common.continue') }));
    await settleScreen();
    expect(heading1()).toBe(text('firstrun.location.h1'));
    expect(readCurrentPath()).toBe(LOCATION_PATH);
    expect(screen.queryByRole('link', { name: text('common.back') })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: text('firstrun.location.skip') }));
    await settleScreen();
    expectHelpPage();
    expect(readCurrentPath()).toBe(LOCATION_PATH);
  });

  // ME-15, FIRST-12, D-111: with only the location step not finished it shows first
  it('shows the location step first when only that step is not finished', async () => {
    localStorage.removeItem(LOCATION_STEP_DONE_STORAGE_KEY);
    await open(LOCATION_PATH);
    expect(heading1()).toBe(text('firstrun.location.h1'));
    expect(pageHas('profile.location.without')).toBe(false);
  });
});
