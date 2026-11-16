// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createInstance } from 'i18next';
import type { ReactElement } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { installDialogMethods, pressEscapeIn } from '@shared/test-support/dialog-methods';
import { restoreBrowserLocation } from '@shared/test-support/geolocation-fakes';
import {
  ENGLISH_CODE,
  getLocaleMessages,
  getLocaleText,
  LANGUAGE_CODES,
} from '@shared/test-support/locale-texts';
import { RouterLocationProbe } from '@shared/test-support/RouterLocationProbe';
import { readCurrentPath } from '@shared/test-support/router-location';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import { CONTACT_EMAIL, SOURCE_CODE_URL } from '@constants/contact';
import {
  INSTALL_STEP_DONE_STORAGE_KEY,
  LOCATION_STEP_DONE_STORAGE_KEY,
} from '@constants/first-run';
import { API_PATH_PREFIX, STATUS_OK } from '@constants/http';
import { LANGUAGE_STORAGE_KEY, LANGUAGES } from '@constants/languages';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const LOCALES_PATH = '/locales/';

const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);

const MEMBER: ProfileResponse = {
  ...PROFILE,
  display_name: 'Dana Levi',
  city: 'Haifa',
  terms_accepted: true,
};

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

beforeEach(async () => {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.clear();
  // FIRST-11, FIRST-12: with the first-run flags unset the steps take the place of Profile
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
  installDialogMethods();
  restoreBrowserLocation();
  fetchMock.mockReset();
  fetchMock.mockImplementation((url) => {
    const locale = LANGUAGE_CODES.find((code) => url.endsWith(`${LOCALES_PATH}${code}.json`));
    if (locale !== undefined) {
      return Promise.resolve(jsonResponse(STATUS_OK, getLocaleMessages(locale)));
    }
    return Promise.resolve(jsonResponse(STATUS_OK, MEMBER));
  });
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---- the screen

type Language = (typeof LANGUAGES)[number];

const languageOf = (code: string): Language => {
  const found = LANGUAGES.find((language) => language.code === code);
  if (found === undefined) throw new Error(`no language ${code}`);
  return found;
};

/** The language the test switches to: the next one in the list. */
const otherThan = (code: string): Language => {
  const index = LANGUAGES.findIndex((language) => language.code === code);
  return LANGUAGES[(index + 1) % LANGUAGES.length];
};

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;

const BROWSER_BACK_TEST_ID = 'browser-back';

/** The browser's own Back button: the legal pages carry no Back link of their own. */
function BrowserBack(): ReactElement {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      data-testid={BROWSER_BACK_TEST_ID}
      onClick={() => {
        void navigate(-1);
      }}
    />
  );
}

/** The app in an i18n instance that holds all four real locale files, so a switch needs no request. */
async function renderApp(path: string, code: string): Promise<void> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: code,
    fallbackLng: false,
    resources: Object.fromEntries(
      LANGUAGE_CODES.map((one) => [one, { translation: getLocaleMessages(one) }])
    ),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <RouterLocationProbe />
        <BrowserBack />
      </MemoryRouter>
    </I18nextProvider>
  );
  await settleScreen();
}

async function openProfile(code = ENGLISH_CODE): Promise<void> {
  fakeUserManager.setUser(makeUser());
  await renderApp('/profile', code);
}

const settingsGroup = (code: string): HTMLElement =>
  screen.getByRole('region', { name: text('profile.settings.title', code) });
const supportGroup = (code: string): HTMLElement =>
  screen.getByRole('region', { name: text('profile.support.title', code) });

/** The row is one button whose name holds its title and the current language under it. */
function languageRow(code: string, shownLanguage: string = code): HTMLElement {
  const title = text('profile.settings.language', code);
  const label = languageOf(shownLanguage).label;
  return within(settingsGroup(code)).getByRole('button', {
    name: (name) => name.includes(title) && name.includes(label),
  });
}

const dialogElement = (code: string): HTMLDialogElement => {
  const found = screen.getByRole('dialog', { name: text('lang.choose', code) });
  if (!(found instanceof HTMLDialogElement)) throw new Error('the dialog is not a <dialog>');
  return found;
};
const dialogIsOpen = (): boolean => document.querySelector('dialog[open]') !== null;

/** The four language buttons of the dialog, in order. */
const languageButtons = (code: string): HTMLElement[] =>
  within(dialogElement(code))
    .getAllByRole('button')
    .filter((button) => button.hasAttribute('lang'));

const buttonOfLanguage = (code: string, wanted: string): HTMLElement => {
  const found = languageButtons(code).find((button) => button.getAttribute('lang') === wanted);
  if (found === undefined) throw new Error(`no button for ${wanted}`);
  return found;
};

async function openLanguageDialog(code: string): Promise<void> {
  fireEvent.click(languageRow(code));
  await settleScreen();
}

function expectFourLanguages(code: string): void {
  const buttons = languageButtons(code);
  expect(buttons.map((button) => button.getAttribute('lang'))).toEqual(
    LANGUAGES.map((language) => language.code)
  );
  LANGUAGES.forEach((language, index) => {
    expect(buttons[index].getAttribute('dir')).toBe(language.dir);
    expect(buttons[index].textContent.trim()).toBe(language.label);
    expect(buttons[index].getAttribute('aria-current')).toBe(
      language.code === code ? 'true' : 'false'
    );
  });
}

const requestedUrls = (): string[] => fetchMock.mock.calls.map(([url]) => url);

// ---- ME-16

describe('the Language row of Profile', () => {
  // ME-16, D-32, D-85: the row says Language, with the current language in its own script, its code and direction
  it.each(LANGUAGE_CODES)('shows the current language under its title, in %s', async (code) => {
    await openProfile(code);
    const row = languageRow(code);
    const language = languageOf(code);
    expect(row.textContent).toContain(text('profile.settings.language', code));
    const hint = row.querySelector('span[lang]');
    expect(hint?.textContent.trim()).toBe(language.label);
    expect(hint?.getAttribute('lang')).toBe(code);
    expect(hint?.getAttribute('dir')).toBe(language.dir);
    // it is the first row of the Settings group
    expect(within(settingsGroup(code)).getAllByRole('button')[0]).toBe(row);
  });

  // ME-16, D-32, D-85: pressing the row opens the dialog with the four languages, the current one marked
  it.each(LANGUAGE_CODES)('opens a dialog with the four languages, in %s', async (code) => {
    await openProfile(code);
    expect(dialogIsOpen()).toBe(false);
    await openLanguageDialog(code);
    expect(dialogIsOpen()).toBe(true);
    expectFourLanguages(code);
    expect(
      within(dialogElement(code)).getByRole('button', { name: text('common.close', code) })
    ).toBeDefined();
  });

  // ME-16, D-32, D-85: another language closes the dialog and switches the page at once, with no request but the locale file
  it.each(LANGUAGE_CODES)('switches the page when another is pressed, from %s', async (code) => {
    await openProfile(code);
    await openLanguageDialog(code);
    const next = otherThan(code);
    const before = requestedUrls().length;
    fireEvent.click(buttonOfLanguage(code, next.code));
    await settleScreen();

    expect(dialogIsOpen()).toBe(false);
    expect(heading1()).toBe(text('profile.heading', next.code));
    expect(readCurrentPath()).toBe('/profile');
    expect(replace).not.toHaveBeenCalled();

    const sent = requestedUrls().slice(before);
    expect(sent.filter((url) => url.includes(API_PATH_PREFIX))).toEqual([]);
    expect(sent.filter((url) => !url.endsWith(`${LOCALES_PATH}${next.code}.json`))).toEqual([]);

    // the row now shows the new language, and the dialog marks it
    const hint = languageRow(next.code).querySelector('span[lang]');
    expect(hint?.getAttribute('lang')).toBe(next.code);
    expect(hint?.getAttribute('dir')).toBe(next.dir);
    expect(hint?.textContent.trim()).toBe(next.label);
    await openLanguageDialog(next.code);
    expectFourLanguages(next.code);
  });

  describe.each(LANGUAGE_CODES)('the dialog opened in %s', (code) => {
    const ways: [string, () => void][] = [
      [
        'the Close button',
        () => {
          fireEvent.click(
            within(dialogElement(code)).getByRole('button', { name: text('common.close', code) })
          );
        },
      ],
      [
        'Escape',
        () => {
          pressEscapeIn(dialogElement(code));
        },
      ],
      [
        'a tap on the scrim',
        () => {
          fireEvent.click(dialogElement(code));
        },
      ],
    ];

    // ME-16, D-32: Close, Escape and the scrim change nothing
    it.each(ways)('is closed by %s and changes nothing', async (_name, close) => {
      await openProfile(code);
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const before = requestedUrls().length;
      await openLanguageDialog(code);
      close();
      await settleScreen();

      expect(dialogIsOpen()).toBe(false);
      expect(heading1()).toBe(text('profile.heading', code));
      expect(languageRow(code)).toBeDefined();
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(stored);
      expect(requestedUrls()).toHaveLength(before);

      // it opens again
      await openLanguageDialog(code);
      expect(dialogIsOpen()).toBe(true);
      expectFourLanguages(code);
    });
  });

  // ME-16, D-32: a tap inside the dialog, on a language's neighbour or the list, is not a tap on the scrim
  it('stays open when the title of the dialog is tapped', async () => {
    await openProfile();
    await openLanguageDialog(ENGLISH_CODE);
    fireEvent.click(within(dialogElement(ENGLISH_CODE)).getByText(text('lang.choose')));
    await settleScreen();
    expect(dialogIsOpen()).toBe(true);
  });

  // ME-16, D-32, D-85: the globe button of the public pages opens the same dialog
  it.each(LANGUAGE_CODES)('is opened by the landing page globe button, in %s', async (code) => {
    await renderApp('/', code);
    expect(dialogIsOpen()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: text('lang.choose', code) }));
    await settleScreen();
    expect(dialogIsOpen()).toBe(true);
    expectFourLanguages(code);

    const next = otherThan(code);
    fireEvent.click(buttonOfLanguage(code, next.code));
    await settleScreen();
    expect(dialogIsOpen()).toBe(false);
    expect(screen.getByRole('button', { name: text('lang.choose', next.code) })).toBeDefined();
  });
});

// ---- ME-17

const SUPPORT_TITLES = [
  'common.contact',
  'landing.source',
  'legal.terms.title',
  'legal.privacy.title',
];
const SUPPORT_HREFS = [`mailto:${CONTACT_EMAIL}`, SOURCE_CODE_URL, '/terms', '/privacy'];
const DONATION_WORDS = /donat|paypal|buymeacoffee|ko-fi|patreon/i;

const supportLinks = (code: string): HTMLElement[] =>
  within(supportGroup(code)).getAllByRole('link');

describe('the Support and info group of Profile', () => {
  // ME-17, D-74: two groups, Settings then Support and info; no donate row, no stats, no admin group
  it.each(LANGUAGE_CODES)('is the second of two groups, in %s', async (code) => {
    await openProfile(code);
    const groups = screen.getAllByRole('region');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toBe(settingsGroup(code));
    expect(groups[1]).toBe(supportGroup(code));
    expect(groups.map((group) => group.querySelector('h2')?.textContent.trim())).toEqual([
      text('profile.settings.title', code),
      text('profile.support.title', code),
    ]);
    // the group sits under Settings
    expect(
      settingsGroup(code).compareDocumentPosition(supportGroup(code)) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeGreaterThan(0);
  });

  // ME-17, D-74: four rows, in order, with their titles
  it.each(LANGUAGE_CODES)('has the four rows in order, in %s', async (code) => {
    await openProfile(code);
    const links = supportLinks(code);
    expect(links).toHaveLength(SUPPORT_TITLES.length);
    SUPPORT_TITLES.forEach((key, index) => {
      expect(links[index].textContent).toContain(text(key, code));
      expect(links[index].getAttribute('href')).toBe(SUPPORT_HREFS[index]);
    });
    expect(within(supportGroup(code)).queryAllByRole('button')).toHaveLength(0);
  });

  // ME-17, D-74: the address sits under Contact, drawn left to right even in Hebrew and Arabic, a mailto link
  it.each(LANGUAGE_CODES)('shows the address left to right under Contact, in %s', async (code) => {
    await openProfile(code);
    const contact = supportLinks(code)[0];
    expect(contact.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}`);
    expect(contact.hasAttribute('target')).toBe(false);
    const address = Array.from(contact.querySelectorAll('[dir]')).find(
      (node) => node.textContent.trim() === CONTACT_EMAIL
    );
    expect(address?.getAttribute('dir')).toBe('ltr');
  });

  // ME-17, D-74: Source code opens the public repository in a new tab, safely
  it('opens the source code in a new tab with rel noopener noreferrer', async () => {
    await openProfile();
    const source = supportLinks(ENGLISH_CODE)[1];
    expect(source.getAttribute('href')).toBe(SOURCE_CODE_URL);
    expect(source.getAttribute('target')).toBe('_blank');
    expect((source.getAttribute('rel') ?? '').split(/\s+/).sort()).toEqual([
      'noopener',
      'noreferrer',
    ]);
  });

  // ME-17, D-74: no donate row and no link to anything donation related, anywhere on the page
  it.each(LANGUAGE_CODES)('has no donate row, in %s', async (code) => {
    await openProfile(code);
    const messages = getLocaleMessages(code);
    if (Object.hasOwn(messages, 'landing.donate')) {
      expect(document.body.textContent).not.toContain(messages['landing.donate']);
    }
    for (const link of Array.from(document.querySelectorAll('a'))) {
      expect(link.getAttribute('href') ?? '').not.toMatch(DONATION_WORDS);
    }
  });

  // ME-17, D-74: Terms and Privacy open in the app with no reload, and Back returns to Profile
  it.each([
    ['/terms', 2],
    ['/privacy', 3],
  ])('opens %s in the app and Back returns to Profile', async (path, index) => {
    await openProfile();
    fireEvent.click(supportLinks(ENGLISH_CODE)[index]);
    await settleScreen();

    expect(readCurrentPath()).toBe(path);
    expect(replace).not.toHaveBeenCalled();
    expect(heading1()).not.toBe(text('profile.heading'));

    fireEvent.click(screen.getByTestId(BROWSER_BACK_TEST_ID));
    await settleScreen();
    expect(readCurrentPath()).toBe('/profile');
    expect(heading1()).toBe(text('profile.heading'));
    expect(supportGroup(ENGLISH_CODE)).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });
});
