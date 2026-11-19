// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
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

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;

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

/** A new page load: the modules are read afresh, as a closed and reopened tab would. */
async function loadApp(): Promise<void> {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
}

/** What the browser says about location: the Permissions API and whether `geolocation` exists. */
const NOT_ASKED: BrowserLocationOptions = { permission: 'prompt', geolocation: true };

beforeEach(async () => {
  await loadApp();
  sessionStorage.clear();
  localStorage.clear();
  // FIRST-11, D-110: the location step comes after the install step
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  browser = installBrowserLocation(NOT_ASKED);
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
  vi.unstubAllGlobals();
});

// ---- the screen

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;
const allowButton = (code = ENGLISH_CODE): HTMLElement | null =>
  screen.queryByRole('button', { name: text('firstrun.location.allow', code) });
const pendingButton = (): HTMLElement | null =>
  screen.queryByRole('button', { name: text('firstrun.location.pending') });
const skipButton = (code = ENGLISH_CODE): HTMLElement | null =>
  screen.queryByRole('button', { name: text('firstrun.location.skip', code) });
const waitingLines = (): HTMLElement[] =>
  screen
    .queryAllByRole('status')
    .filter((node) => node.textContent.includes(text('firstrun.location.waiting')));
const firstRunKeys = (): string[] =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(FIRST_RUN_STORAGE_PREFIX))
    .sort();
const locationDone = (): boolean => localStorage.getItem(LOCATION_STEP_DONE_STORAGE_KEY) !== null;
const writeRequests = (): unknown[] =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET').toUpperCase() !== 'GET');

function mustFind(found: HTMLElement | null, what: string): HTMLElement {
  if (found === null) throw new Error(`there is no ${what}`);
  return found;
}

function expectLocationStep(code = ENGLISH_CODE): void {
  expect(heading1()).toBe(text('firstrun.location.h1', code));
  expect(allowButton(code)).not.toBeNull();
  expect(skipButton(code)).not.toBeNull();
  expect(allowButton(code)?.hasAttribute('disabled')).toBe(false);
  expect(skipButton(code)?.hasAttribute('disabled')).toBe(false);
}

function expectNoLocationStep(): void {
  expect(heading1()).not.toBe(text('firstrun.location.h1'));
  expect(pendingButton()).toBeNull();
  // the help page has its own "Turn on location" button: only the step has the skip button
  expect(skipButton()).toBeNull();
}

function expectProfilePage(): void {
  expect(heading1()).toBe(text('profile.heading'));
  expectNoLocationStep();
  expect(allowButton()).toBeNull();
  expect(readCurrentPath()).toBe('/profile');
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
async function reopen(
  options: BrowserLocationOptions = NOT_ASKED,
  path = '/profile'
): Promise<void> {
  cleanup();
  await loadApp();
  browser = installBrowserLocation(options);
  await open(path);
}

async function pressAllow(): Promise<void> {
  fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
  await settleScreen();
}

async function pressSkip(): Promise<void> {
  fireEvent.click(mustFind(skipButton(), 'Continue without location button'));
  await settleScreen();
}

/** The member answers the browser's prompt, and the app gets a moment to react. */
async function answer(how: 'position' | 'refusal'): Promise<void> {
  if (how === 'position') browser.answerWithPosition();
  else browser.answerWithRefusal();
  await settleScreen();
}

// ---- FIRST-12: when the step shows

describe('the location step, what it shows', () => {
  // FIRST-12, D-31, D-111: with nothing decided the step shows, with both buttons, and stores nothing
  it.each<[string, BrowserLocationOptions]>([
    ['has not been asked', { permission: 'prompt', geolocation: true }],
    ['has refused', { permission: 'denied', geolocation: true }],
    ['has no Permissions API', { permission: null, geolocation: true }],
  ])('shows when the browser %s', async (_name, options) => {
    browser = installBrowserLocation(options);
    await open();
    expectLocationStep();
    expect(readCurrentPath()).toBe('/profile');
    expect(waitingLines()).toHaveLength(0);
    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
    expect(locationDone()).toBe(false);
  });

  // FIRST-12, D-111: the step has the two buttons and asks nothing before one is pressed
  it('has exactly the two buttons and asks nothing before one is pressed', async () => {
    await open();
    const words = screen
      .getAllByRole('button')
      .map((node) => node.textContent.trim())
      .filter((label) => label !== '');
    expect(words).toEqual([text('firstrun.location.allow'), text('firstrun.location.skip')]);
    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
  });

  // FIRST-12, D-31, D-111: already granted, or no geolocation at all: the step is skipped and no flag is stored
  it.each<[string, BrowserLocationOptions]>([
    ['the permission is granted', { permission: 'granted', geolocation: true }],
    [
      'there is no geolocation, the permission is not asked',
      { permission: 'prompt', geolocation: false },
    ],
    [
      'there is no geolocation, the permission is refused',
      { permission: 'denied', geolocation: false },
    ],
    ['there is no geolocation and no Permissions API', { permission: null, geolocation: false }],
    [
      'there is no geolocation, the permission is granted',
      { permission: 'granted', geolocation: false },
    ],
  ])('never shows when %s, and stores no flag', async (_name, options) => {
    browser = installBrowserLocation(options);
    await open();
    expectProfilePage();
    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
    expect(locationDone()).toBe(false);
  });

  // FIRST-12, D-31, D-111: every language has the step
  it.each(LANGUAGE_CODES)('is in %s', async (code) => {
    await open('/profile', code);
    expectLocationStep(code);
  });

  // FIRST-12, D-111, D-110: the step takes the place of every page under the gate until its flag is set, and the address stays
  it.each(['/profile', '/profile/install', '/profile/location', '/nowhere/at/all'])(
    'takes the place of the page at %s, then gives it back',
    async (path) => {
      await open(path);
      expectLocationStep();
      expect(readCurrentPath()).toBe(path);

      await pressSkip();
      expect(locationDone()).toBe(true);
      expectNoLocationStep();
      expect(readCurrentPath()).toBe(path);
    }
  );

  // FIRST-12, D-111, D-110: the install step comes first; the location step follows its Continue
  it('comes after the install step', async () => {
    localStorage.removeItem(INSTALL_STEP_DONE_STORAGE_KEY);
    await open();
    expect(heading1()).toBe(text('firstrun.install.h1'));
    expect(allowButton()).toBeNull();
    expect(skipButton()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: text('common.continue') }));
    await settleScreen();
    expectLocationStep();
    expect(locationDone()).toBe(false);
    expect(readCurrentPath()).toBe('/profile');

    await pressSkip();
    expectProfilePage();
  });

  // FIRST-12, D-111: with the location already granted the install step's Continue goes straight to the page
  it('is passed over after the install step when the permission is already granted', async () => {
    localStorage.removeItem(INSTALL_STEP_DONE_STORAGE_KEY);
    browser = installBrowserLocation({ permission: 'granted', geolocation: true });
    await open();
    fireEvent.click(screen.getByRole('button', { name: text('common.continue') }));
    await settleScreen();
    expectProfilePage();
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
  });

  // FIRST-12, FIRST-07, D-111, D-108: a member who has not accepted the terms sees the sign-up form, not the step
  it('is not shown while the terms are not accepted: the sign-up form comes first', async () => {
    await open('/profile', ENGLISH_CODE, NEW_MEMBER);
    expect(heading1()).toBe(text('firstrun.profile.h1'));
    expectNoLocationStep();
    expect(locationDone()).toBe(false);
  });
});

// ---- FIRST-12: Turn on location

describe('the location step, Turn on location', () => {
  // FIRST-12, D-111: it asks the browser once, for a precise position, with a time limit
  it('asks the browser once for a precise position', async () => {
    await open();
    await pressAllow();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    const [success, error, options] = browser.getCurrentPosition.mock.calls[0];
    expect(typeof success).toBe('function');
    expect(typeof error).toBe('function');
    expect(options?.enableHighAccuracy).toBe(true);
    expect(typeof options?.timeout).toBe('number');
  });

  // FIRST-12, D-111: while the prompt is open both buttons are disabled, the label says so and a waiting line shows
  it('disables both buttons and shows the waiting line while the prompt is open', async () => {
    await open();
    await pressAllow();
    expect(browser.openPrompts()).toBe(1);

    expect(allowButton()).toBeNull();
    expect(
      mustFind(pendingButton(), 'button with the waiting label').hasAttribute('disabled')
    ).toBe(true);
    expect(
      mustFind(skipButton(), 'Continue without location button').hasAttribute('disabled')
    ).toBe(true);
    expect(waitingLines()).toHaveLength(1);
    expect(heading1()).toBe(text('firstrun.location.h1'));
    expect(locationDone()).toBe(false);
    expect(readCurrentPath()).toBe('/profile');
  });

  // FIRST-12, D-111: two presses at once ask the browser once
  it('asks once for two presses at once', async () => {
    await open();
    const first = mustFind(allowButton(), 'Turn on location button');
    fireEvent.click(first);
    fireEvent.click(first);
    await settleScreen();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  // FIRST-12, D-111: pressing a button while the prompt is open changes nothing
  it('ignores presses of the buttons while the prompt is open', async () => {
    await open();
    await pressAllow();
    fireEvent.click(mustFind(pendingButton(), 'button with the waiting label'));
    fireEvent.click(mustFind(skipButton(), 'Continue without location button'));
    await settleScreen();

    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(locationDone()).toBe(false);
    expect(heading1()).toBe(text('firstrun.location.h1'));
    expect(waitingLines()).toHaveLength(1);
  });

  // FIRST-12, D-111: a position stores the flag and shows the page that was asked for
  it('stores the flag and shows the page when the member allows', async () => {
    await open();
    await pressAllow();
    await answer('position');

    expect(locationDone()).toBe(true);
    expect(firstRunKeys()).toEqual(
      [INSTALL_STEP_DONE_STORAGE_KEY, LOCATION_STEP_DONE_STORAGE_KEY].sort()
    );
    expectProfilePage();
    expect(waitingLines()).toHaveLength(0);
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  // FIRST-12, D-31, D-111: a refusal stores the flag too, and nothing blocks the page
  it('stores the flag and shows the page when the member refuses', async () => {
    await open();
    await pressAllow();
    await answer('refusal');

    expect(locationDone()).toBe(true);
    expectProfilePage();
    expect(waitingLines()).toHaveLength(0);
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
  });

  // FIRST-12, D-111: the answer is thrown away: nothing is sent to the server
  it.each(['position', 'refusal'] as const)('sends no write request after a %s', async (how) => {
    await open();
    await pressAllow();
    await answer(how);
    expect(writeRequests()).toEqual([]);
  });

  // FIRST-12, D-111: a prompt nobody answers keeps the step as it is, and no flag is stored
  it('keeps waiting when the prompt is not answered', async () => {
    await open();
    await pressAllow();
    await settleScreen();
    expect(
      mustFind(pendingButton(), 'button with the waiting label').hasAttribute('disabled')
    ).toBe(true);
    expect(waitingLines()).toHaveLength(1);
    expect(locationDone()).toBe(false);
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
  });

  // FIRST-12, D-111: closing the tab with the prompt still open shows the step again
  it('shows the step again when the page is opened again with the prompt unanswered', async () => {
    await open();
    await pressAllow();
    await reopen();
    expectLocationStep();
    expect(locationDone()).toBe(false);
    expect(waitingLines()).toHaveLength(0);
  });

  // FIRST-12, D-111: the waiting label and line are the only text that changes
  it('keeps the heading and the skip words while waiting, in every language', async () => {
    for (const code of LANGUAGE_CODES) {
      cleanup();
      browser = installBrowserLocation(NOT_ASKED);
      await open('/profile', code);
      fireEvent.click(mustFind(allowButton(code), 'Turn on location button'));
      await settleScreen();
      expect(heading1()).toBe(text('firstrun.location.h1', code));
      expect(skipButton(code)?.hasAttribute('disabled')).toBe(true);
      expect(
        screen.getByRole('button', { name: text('firstrun.location.pending', code) })
      ).not.toBeNull();
      expect(
        screen
          .queryAllByRole('status')
          .some((node) => node.textContent.includes(text('firstrun.location.waiting', code)))
      ).toBe(true);
    }
  });
});

// ---- FIRST-12: Continue without location

describe('the location step, Continue without location', () => {
  // FIRST-12, D-31, D-111: it asks the browser for nothing, stores the flag and shows the page
  it('asks the browser for nothing, stores the flag and shows the page', async () => {
    await open();
    await pressSkip();

    expect(browser.getCurrentPosition).not.toHaveBeenCalled();
    expect(browser.openPrompts()).toBe(0);
    expect(locationDone()).toBe(true);
    expect(firstRunKeys()).toEqual(
      [INSTALL_STEP_DONE_STORAGE_KEY, LOCATION_STEP_DONE_STORAGE_KEY].sort()
    );
    expectProfilePage();
    expect(writeRequests()).toEqual([]);
    expect(replace).not.toHaveBeenCalled();
  });

  // FIRST-12, D-111: nothing is stored by anything but a button
  it('stores nothing until a button is pressed', async () => {
    await open();
    await settleScreen();
    expectLocationStep();
    expect(locationDone()).toBe(false);
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
  });
});

// ---- FIRST-12: closing the tab, and once stored

describe('the location step, when the page is opened again', () => {
  // FIRST-12, D-111: closing the tab at the step shows it again
  it('shows the step again when opened again before either button', async () => {
    await open();
    await reopen();
    expectLocationStep();
    expect(locationDone()).toBe(false);
    expect(firstRunKeys()).toEqual([INSTALL_STEP_DONE_STORAGE_KEY]);
  });

  const BROWSER_SAYS: [string, BrowserLocationOptions][] = [
    ['has not been asked', { permission: 'prompt', geolocation: true }],
    ['has refused', { permission: 'denied', geolocation: true }],
    ['has granted', { permission: 'granted', geolocation: true }],
    ['has no Permissions API', { permission: null, geolocation: true }],
    ['has no geolocation', { permission: 'prompt', geolocation: false }],
  ];

  // FIRST-12, D-111: after Continue without location the step never shows again, whatever the browser says
  it.each(BROWSER_SAYS)(
    'is not shown again after Continue without location when the browser %s',
    async (_name, options) => {
      await open();
      await pressSkip();
      await reopen(options);
      expectProfilePage();
      expect(locationDone()).toBe(true);
    }
  );

  // FIRST-12, D-111: the same after a position
  it.each(BROWSER_SAYS)(
    'is not shown again after a position when the browser %s',
    async (_name, options) => {
      await open();
      await pressAllow();
      await answer('position');
      await reopen(options);
      expectProfilePage();
      expect(locationDone()).toBe(true);
    }
  );

  // FIRST-12, D-31, D-111: the same after a refusal, even though the browser still has not been asked
  it.each(BROWSER_SAYS)(
    'is not shown again after a refusal when the browser %s',
    async (_name, options) => {
      await open();
      await pressAllow();
      await answer('refusal');
      await reopen(options);
      expectProfilePage();
      expect(locationDone()).toBe(true);
    }
  );

  // FIRST-12, D-111: the flag is only the key's presence, and it gives the page back at any address
  it.each(['/profile', '/profile/install', '/profile/location', '/nowhere/at/all'])(
    'is not shown at %s when the flag is set',
    async (path) => {
      localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
      await open(path);
      expectNoLocationStep();
      expect(readCurrentPath()).toBe(path);
    }
  );
});

// ---- the permission the browser reports changes while the step is open

describe('the location step, when the browser says something else later', () => {
  // FIRST-12, D-111: a flag stored by a button is not undone by the browser's later answer
  it.each<PermissionAnswer>(['granted', 'denied', 'prompt'])(
    'keeps the page after a button when the permission becomes %s',
    async (later) => {
      await open();
      await pressSkip();
      browser.setPermission(later);
      await settleScreen();
      expectProfilePage();
      expect(locationDone()).toBe(true);
    }
  );
});
