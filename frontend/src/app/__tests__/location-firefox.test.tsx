// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { answerCityFile } from '@shared/test-support/city-files-fake';
import { ENGLISH_CODE, getLocaleText } from '@shared/test-support/locale-texts';
import { HAIFA_ID } from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import {
  INSTALL_STEP_DONE_STORAGE_KEY,
  LOCATION_STEP_DONE_STORAGE_KEY,
} from '@constants/first-run';
import { STATUS_OK } from '@constants/http';
import { GEOLOCATION_ERROR_CODES, LOCATION_GRANTED_STORAGE_KEY } from '@constants/location';

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

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;
let restoreUserAgent: () => void = () => undefined;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

// ---- the user agents

const FIREFOX_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0';
const FIREFOX_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/126.0.0.0`;
const OPERA = `${CHROME_WINDOWS} OPR/111.0.0.0`;
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const FIREFOXES: [string, string][] = [
  ['Firefox on Windows', FIREFOX_WINDOWS],
  ['Firefox on Android', FIREFOX_ANDROID],
  ['Firefox on an iPhone (FxiOS)', FIREFOX_IPHONE],
];

const OTHER_BROWSERS: [string, string][] = [
  ['Chrome on Windows', CHROME_WINDOWS],
  ['Chrome on Android', CHROME_ANDROID],
  ['Edge on Windows', EDGE_WINDOWS],
  ['Opera', OPERA],
  ['Safari on a Mac', SAFARI_MAC],
  ['Safari on an iPhone', SAFARI_IPHONE],
];

// ---- a browser whose Permissions API never changes its answer (Firefox's bug), and a geolocation that waits

type PermissionAnswer = 'granted' | 'denied' | 'prompt';

interface FixedBrowser {
  getCurrentPosition: ReturnType<typeof vi.fn<Geolocation['getCurrentPosition']>>;
  answerWithPosition: () => void;
  answerWithError: (code: number) => void;
}

const POSITION: GeolocationPosition = {
  coords: {
    accuracy: 1,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: 0,
    longitude: 0,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 0,
  toJSON: () => ({}),
};

/** `null`: no `navigator.permissions` at all. The answer of `query` stays the same whatever the member does. */
function installFixedBrowser(permission: PermissionAnswer | null): FixedBrowser {
  const open: { success: PositionCallback; error: PositionErrorCallback | null | undefined }[] = [];
  const query = vi.fn<(descriptor: PermissionDescriptor) => Promise<{ state: string }>>(() =>
    Promise.resolve({ state: permission ?? 'prompt' })
  );
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success, error) => {
    open.push({ success, error });
  });
  if (permission !== null) {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query } });
  }
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return {
    getCurrentPosition,
    answerWithPosition: () => open.shift()?.success(POSITION),
    answerWithError: (code) =>
      open.shift()?.error?.({ code, message: '', ...GEOLOCATION_ERROR_CODES }),
  };
}

let browser: FixedBrowser;

/** A new page load with the given user agent and Permissions API answer; `flags`: the first-run steps already done. */
async function boot(
  userAgent: string,
  permission: PermissionAnswer | null,
  doneSteps: boolean
): Promise<void> {
  const spy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  restoreUserAgent = () => {
    spy.mockRestore();
  };
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  if (doneSteps) localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
  browser = installFixedBrowser(permission);
  fetchMock.mockReset();
  fetchMock.mockImplementation((url) =>
    Promise.resolve(answerCityFile(url) ?? jsonResponse(STATUS_OK, MEMBER))
  );
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'permissions');
  Reflect.deleteProperty(navigator, 'geolocation');
  restoreUserAgent();
  restoreUserAgent = () => undefined;
  vi.unstubAllGlobals();
});

// ---- the screen

const text = (key: string): string => getLocaleText(ENGLISH_CODE, key);
const pageHas = (key: string): boolean => document.body.textContent.includes(text(key));
const remembered = (): string | null => localStorage.getItem(LOCATION_GRANTED_STORAGE_KEY);
const remember = (value = 'true'): void => {
  localStorage.setItem(LOCATION_GRANTED_STORAGE_KEY, value);
};
const allowButton = (): HTMLElement | null =>
  screen.queryByRole('button', { name: text('firstrun.location.allow') });
const backLink = (): HTMLElement => screen.getByRole('link', { name: text('common.back') });

function mustFind(found: HTMLElement | null, what: string): HTMLElement {
  if (found === null) throw new Error(`there is no ${what}`);
  return found;
}

async function open(path: string): Promise<void> {
  fakeUserManager.setUser(makeUser());
  await renderAppAtPath(<App />, path, ENGLISH_CODE);
  await settleScreen();
}

function locationRow(): HTMLElement {
  const settings = screen.getByRole('region', { name: text('profile.settings.title') });
  return within(settings).getByRole('button', {
    name: (name) => name.includes(text('profile.settings.location')),
  });
}

/** The chip is a small element in the row whose own words are On or Off. */
function chipsOf(row: HTMLElement): string[] {
  const words = [text('profile.location.on'), text('profile.location.off')];
  return [row, ...Array.from(row.querySelectorAll('*'))]
    .map((node) =>
      Array.from(node.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => (child.textContent ?? '').trim())
        .join('')
    )
    .filter((word) => words.includes(word));
}

const ON = [text('profile.location.on')];
const OFF = [text('profile.location.off')];

type PageTitle = 'granted' | 'denied' | 'notAsked';
const TITLE_KEYS: Record<PageTitle, string> = {
  granted: 'profile.location.grantedTitle',
  denied: 'profile.location.deniedTitle',
  notAsked: 'profile.location.notAskedTitle',
};

function expectPageTitle(title: PageTitle): void {
  expect(pageHas(TITLE_KEYS[title])).toBe(true);
  const words = text(TITLE_KEYS[title]);
  for (const [name, key] of Object.entries(TITLE_KEYS)) {
    if (name !== title && !words.includes(text(key))) expect(pageHas(key)).toBe(false);
  }
}

/** What the member (or the browser) answers to the request for a position. */
type Answer = 'position' | 'timeout' | 'unavailable' | 'refusal';
const ANSWER_CODES = {
  timeout: GEOLOCATION_ERROR_CODES.TIMEOUT,
  unavailable: GEOLOCATION_ERROR_CODES.POSITION_UNAVAILABLE,
  refusal: GEOLOCATION_ERROR_CODES.PERMISSION_DENIED,
} as const;

async function answer(how: Answer): Promise<void> {
  if (how === 'position') browser.answerWithPosition();
  else browser.answerWithError(ANSWER_CODES[how]);
  await settleScreen();
}

const ALLOWED_ANSWERS: Answer[] = ['position', 'timeout', 'unavailable'];

// ---- the status as read when the page opens

/** The permission the Permissions API says, whether the key is there, and the chip and the page title the status gives. */
const FIREFOX_CASES: [string, PermissionAnswer, boolean, string[], PageTitle][] = [
  ['prompt and the last answer was allowed', 'prompt', true, ON, 'granted'],
  ['prompt and nothing remembered', 'prompt', false, OFF, 'notAsked'],
  ['denied, whatever was remembered', 'denied', true, OFF, 'denied'],
  ['denied and nothing remembered', 'denied', false, OFF, 'denied'],
  ['granted, whether remembered or not', 'granted', true, ON, 'granted'],
  ['granted and nothing remembered', 'granted', false, ON, 'granted'],
];

describe('the Location row of Profile, in Firefox', () => {
  // ME-18, D-115, D-31: Firefox believes its own last allowed answer only when the Permissions API says "prompt"
  describe.each(FIREFOXES)('%s', (_name, agent) => {
    it.each(FIREFOX_CASES)(
      'when the Permissions API says %s',
      async (_what, permission, kept, chips) => {
        await boot(agent, permission, true);
        if (kept) remember();
        await open('/profile');
        expect(chipsOf(locationRow())).toEqual(chips);
      }
    );
  });

  // ME-18, D-115: any value of the key counts, only its presence matters
  it.each(['', '0', 'false'])('counts the key present with the value "%s"', async (value) => {
    await boot(FIREFOX_WINDOWS, 'prompt', true);
    remember(value);
    await open('/profile');
    expect(chipsOf(locationRow())).toEqual(ON);
  });

  // ME-18, D-115, D-111: with no Permissions API the remembered answer is not used: still no chip
  it('shows no chip without the Permissions API, whatever was remembered', async () => {
    await boot(FIREFOX_WINDOWS, null, true);
    remember();
    await open('/profile');
    expect(chipsOf(locationRow())).toEqual([]);
  });
});

describe('the Location row of Profile, in every other browser', () => {
  // ME-18, D-115: the remembered answer is ignored: "prompt" means off, "denied" off, "granted" on
  describe.each(OTHER_BROWSERS)('%s', (_name, agent) => {
    it.each<[PermissionAnswer, boolean, string[]]>([
      ['prompt', true, OFF],
      ['prompt', false, OFF],
      ['denied', true, OFF],
      ['granted', true, ON],
      ['granted', false, ON],
    ])('when the Permissions API says %s and the answer is remembered: %s', async (...given) => {
      const [permission, kept, chips] = given;
      await boot(agent, permission, true);
      if (kept) remember();
      await open('/profile');
      expect(chipsOf(locationRow())).toEqual(chips);
    });
  });
});

// ---- the help page

describe('the location help page, the status when it opens', () => {
  // ME-18, D-115: in Firefox the page says what the row says
  it.each(FIREFOXES)('says what Profile says in %s', async (_name, agent) => {
    for (const [, permission, kept, , title] of FIREFOX_CASES) {
      cleanup();
      localStorage.clear();
      await boot(agent, permission, true);
      if (kept) remember();
      await open(LOCATION_PATH);
      expectPageTitle(title);
    }
  });

  // ME-18, D-115: in every other browser "prompt" is "not asked yet", the key being ignored, and Turn on is offered
  it.each(OTHER_BROWSERS)('ignores the remembered answer in %s', async (_name, agent) => {
    await boot(agent, 'prompt', true);
    remember();
    await open(LOCATION_PATH);
    expectPageTitle('notAsked');
    expect(allowButton()).not.toBeNull();
  });

  // ME-18, D-115, D-111: in Firefox with nothing remembered "prompt" is "not asked yet", and Turn on is offered
  it('offers Turn on in Firefox when nothing is remembered', async () => {
    await boot(FIREFOX_WINDOWS, 'prompt', true);
    await open(LOCATION_PATH);
    expectPageTitle('notAsked');
    expect(allowButton()).not.toBeNull();
  });
});

// ---- the answer is stored by the request, and only by it

describe('what is remembered, and who stores it', () => {
  // ME-18, D-115: opening the pages and skipping the step store nothing
  it.each([...FIREFOXES, ...OTHER_BROWSERS])(
    'stores nothing by opening the pages or skipping the step in %s',
    async (_name, agent) => {
      await boot(agent, 'prompt', false);
      await open('/profile');
      fireEvent.click(
        mustFind(
          screen.queryByRole('button', { name: text('firstrun.location.skip') }),
          'Continue without location button'
        )
      );
      await settleScreen();
      expect(remembered()).toBeNull();

      fireEvent.click(locationRow());
      await settleScreen();
      expect(browser.getCurrentPosition).not.toHaveBeenCalled();
      expect(remembered()).toBeNull();
    }
  );

  // ME-18, D-115: the remembered answer is not a first-run flag and writes nothing to the server
  it('sends no write request when the answer is stored', async () => {
    await boot(FIREFOX_WINDOWS, 'prompt', false);
    await open('/profile');
    fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
    await settleScreen();
    await answer('position');
    expect(remembered()).not.toBeNull();
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET').toUpperCase() !== 'GET')
    ).toEqual([]);
  });
});

describe('the location step, what it remembers', () => {
  // ME-18, D-115, D-111, FIRST-12: a position, a timeout and "no signal" are all allowed answers; the key is set
  it.each(
    [...FIREFOXES, ...OTHER_BROWSERS].flatMap(([name, agent]) =>
      ALLOWED_ANSWERS.map((how): [string, string, Answer] => [name, agent, how])
    )
  )('sets the key in %s after: %s', async (_name, agent, how) => {
    await boot(agent, 'prompt', false);
    await open('/profile');
    fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
    await settleScreen();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
    await answer(how);
    expect(remembered()).not.toBeNull();
  });

  // ME-18, D-115, D-31: a refusal (code 1) removes the key, in every browser
  it.each([...FIREFOXES, ...OTHER_BROWSERS])(
    'removes the key in %s after a refusal',
    async (_name, agent) => {
      await boot(agent, 'denied', false);
      remember();
      await open('/profile');
      fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
      await settleScreen();
      await answer('refusal');
      expect(remembered()).toBeNull();
    }
  );

  // ME-18, D-115, D-111: after an allowed answer Firefox's row says on, though the Permissions API still says "prompt"
  it.each(
    FIREFOXES.flatMap(([name, agent]) =>
      ALLOWED_ANSWERS.map((how): [string, string, Answer] => [name, agent, how])
    )
  )('shows an On chip in %s after: %s', async (_name, agent, how) => {
    await boot(agent, 'prompt', false);
    await open('/profile');
    fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
    await settleScreen();
    await answer(how);
    expect(chipsOf(locationRow())).toEqual(ON);
  });

  // ME-18, D-115: after a refusal Firefox's row says off, though the Permissions API still says "prompt"
  it.each(FIREFOXES)('shows an Off chip in %s after a refusal', async (_name, agent) => {
    await boot(agent, 'prompt', false);
    await open('/profile');
    fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
    await settleScreen();
    await answer('refusal');
    expect(chipsOf(locationRow())).toEqual(OFF);
  });

  // ME-18, D-115: Chrome and the others keep following the Permissions API, so the row stays off
  it.each(OTHER_BROWSERS)('shows an Off chip in %s after a position', async (_name, agent) => {
    await boot(agent, 'prompt', false);
    await open('/profile');
    fireEvent.click(mustFind(allowButton(), 'Turn on location button'));
    await settleScreen();
    await answer('position');
    expect(chipsOf(locationRow())).toEqual(OFF);
  });
});

describe('the Turn on button of the location help page, what it remembers', () => {
  async function pressTurnOn(): Promise<void> {
    fireEvent.click(mustFind(allowButton(), 'Turn on button'));
    await settleScreen();
    expect(browser.getCurrentPosition).toHaveBeenCalledTimes(1);
  }

  // ME-18, D-115: in Firefox an allowed answer sets the key and the page says on
  it.each(ALLOWED_ANSWERS)('says on in Firefox after: %s', async (how) => {
    await boot(FIREFOX_WINDOWS, 'prompt', true);
    await open(LOCATION_PATH);
    expectPageTitle('notAsked');
    await pressTurnOn();
    await answer(how);
    expect(remembered()).not.toBeNull();
    expectPageTitle('granted');
  });

  // ME-18, D-115: in Firefox a refusal leaves the key removed and the page says off
  it('says off in Firefox after a refusal', async () => {
    await boot(FIREFOX_WINDOWS, 'prompt', true);
    await open(LOCATION_PATH);
    await pressTurnOn();
    await answer('refusal');
    expect(remembered()).toBeNull();
    expectPageTitle('notAsked');
  });

  // ME-18, D-115, D-111: the page stores the answer in every browser, but only Firefox believes it
  it.each(OTHER_BROWSERS)(
    'sets the key in %s but still says not asked yet',
    async (_name, agent) => {
      await boot(agent, 'prompt', true);
      await open(LOCATION_PATH);
      await pressTurnOn();
      await answer('position');
      expect(remembered()).not.toBeNull();
      expectPageTitle('notAsked');
    }
  );

  // ME-18, D-115, D-111: with no Permissions API the button is offered; a refusal removes the key, a position sets it
  it('removes a remembered key after a refusal when there is no Permissions API', async () => {
    await boot(FIREFOX_WINDOWS, null, true);
    remember();
    await open(LOCATION_PATH);
    await pressTurnOn();
    await answer('refusal');
    expect(remembered()).toBeNull();
  });

  it.each(ALLOWED_ANSWERS)(
    'sets the key after: %s when there is no Permissions API',
    async (how) => {
      await boot(FIREFOX_WINDOWS, null, true);
      await open(LOCATION_PATH);
      await pressTurnOn();
      await answer(how);
      expect(remembered()).not.toBeNull();
    }
  );

  // ME-18, ME-15, D-115: the answer given on the help page shows on Profile after Back
  it('shows the On chip on Profile after Back, in Firefox', async () => {
    await boot(FIREFOX_WINDOWS, 'prompt', true);
    await open('/profile');
    fireEvent.click(locationRow());
    await settleScreen();
    await pressTurnOn();
    await answer('timeout');
    fireEvent.click(backLink());
    await settleScreen();
    expect(chipsOf(locationRow())).toEqual(ON);
  });

  it('shows the Off chip on Profile after Back, in Chrome', async () => {
    await boot(CHROME_WINDOWS, 'prompt', true);
    await open('/profile');
    fireEvent.click(locationRow());
    await settleScreen();
    await pressTurnOn();
    await answer('position');
    fireEvent.click(backLink());
    await settleScreen();
    expect(chipsOf(locationRow())).toEqual(OFF);
  });
});
