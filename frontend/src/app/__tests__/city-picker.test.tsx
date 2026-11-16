// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { CITIES, cityById, expectedFor, shownName } from '@shared/test-support/city-list';
import { installDialogMethods } from '@shared/test-support/dialog-methods';
import {
  ENGLISH_CODE,
  getLocaleMessages,
  getLocaleText,
  LANGUAGE_CODES,
} from '@shared/test-support/locale-texts';
import {
  cityBox,
  HAIFA_ID,
  NO_ARABIC_OR_RUSSIAN_ID,
  NO_RUSSIAN_ID,
  optionNames,
  pickCity,
  TEL_AVIV_ID,
  typeInCityBox,
} from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { RouterLocationProbe } from '@shared/test-support/RouterLocationProbe';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import { jsonResponse, makeUser, PROFILE } from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import {
  INSTALL_STEP_DONE_STORAGE_KEY,
  LOCATION_STEP_DONE_STORAGE_KEY,
} from '@constants/first-run';
import { STATUS_OK } from '@constants/http';
import { CITY_SUGGESTIONS_LIMIT } from '@constants/profile';
import { MEMBER_HOME_PATH } from '@constants/routes';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

// How often the app loads the list file, and whether that load fails (D-117: a chunk of its own, loaded on need)
const listFile = vi.hoisted(() => ({ loads: 0, fails: false }));
vi.mock('@constants/cities.json', async (importOriginal) => {
  // The mock is cached across `vi.resetModules`, so a count of the factory would see only the first load:
  // each read of the file's content counts instead.
  const original = await importOriginal<{ default: unknown }>();
  return {
    get default() {
      listFile.loads += 1;
      if (listFile.fails) throw new Error('the list file could not be loaded');
      return original.default;
    },
  };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const LOCALES_PATH = '/locales/';
/** The list can take a few retries to give up on: a failed load needs a longer wait. */
const FAILED_LOAD_WAIT_MS = 15000;
const FAILED_LOAD_TEST_TIMEOUT_MS = 20000;

const NEW_MEMBER: ProfileResponse = {
  ...PROFILE,
  display_name: null,
  city_id: null,
  terms_accepted: false,
};
const MEMBER: ProfileResponse = { ...PROFILE, display_name: 'Dana Levi', city_id: HAIFA_ID };

/** What a member types for the first row of FIRST-15 in each language. */
const TYPED_IN: Record<string, string> = { he: 'תל', en: 'tel', ar: 'تل', ru: 'Тель' };

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;
let profile: ProfileResponse;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

const methodOf = (init?: RequestInit): string => (init?.method ?? 'GET').toUpperCase();
const bodySchema = z.record(z.string(), z.unknown());

/** The JSON body of a request, read only when it is text. */
function bodyOfRequest(init?: RequestInit): Record<string, unknown> {
  const body = init?.body;
  if (typeof body !== 'string') throw new Error('the body is not JSON text');
  return bodySchema.parse(JSON.parse(body));
}

beforeEach(async () => {
  vi.resetModules();
  listFile.loads = 0;
  listFile.fails = false;
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  localStorage.setItem(LOCATION_STEP_DONE_STORAGE_KEY, 'true');
  installDialogMethods();
  profile = MEMBER;
  fetchMock.mockReset();
  fetchMock.mockImplementation((url, init) => {
    const locale = LANGUAGE_CODES.find((code) => url.endsWith(`${LOCALES_PATH}${code}.json`));
    if (locale !== undefined) {
      return Promise.resolve(jsonResponse(STATUS_OK, getLocaleMessages(locale)));
    }
    if (methodOf(init) !== 'PATCH') return Promise.resolve(jsonResponse(STATUS_OK, profile));
    const sent = bodyOfRequest(init);
    const saved = {
      ...profile,
      display_name:
        typeof sent.display_name === 'string' ? sent.display_name : profile.display_name,
      city_id: typeof sent.city_id === 'number' ? sent.city_id : profile.city_id,
      terms_accepted: true,
    };
    return Promise.resolve(jsonResponse(STATUS_OK, saved));
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

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);
const callsOf = (method: string) =>
  fetchMock.mock.calls.filter(([, init]) => methodOf(init) === method);

async function open(
  answerWith: ProfileResponse,
  code = ENGLISH_CODE,
  path = '/profile'
): Promise<void> {
  profile = answerWith;
  fakeUserManager.setUser(makeUser());
  await renderAppAtPath(<App />, path, code);
  await settleScreen();
}

function buttonIn(code: string, key: string): HTMLElement {
  return screen.getByRole('button', { name: text(key, code) });
}

async function pressIn(code: string, key: string): Promise<void> {
  fireEvent.click(buttonIn(code, key));
  await settleScreen();
}

type Form = 'sign-up' | 'edit';
const FORMS: Form[] = ['sign-up', 'edit'];

/** The sign-up form (a new member) or the edit form of Profile (a member who chose Haifa), in `code`. */
async function openForm(form: Form, code = ENGLISH_CODE): Promise<void> {
  if (form === 'sign-up') {
    await open(NEW_MEMBER, code);
    return;
  }
  await open(MEMBER, code);
  await pressIn(code, 'profile.edit.title');
}

const submitKey = (form: Form): string => (form === 'sign-up' ? 'common.continue' : 'common.save');

function nameField(code = ENGLISH_CODE): HTMLInputElement {
  const found = screen.getByRole('textbox', { name: text('firstrun.name.label', code) });
  if (!(found instanceof HTMLInputElement)) throw new Error('the name box is not an input');
  return found;
}

/** Fills what the sign-up form needs besides the city. */
function fillRest(code = ENGLISH_CODE): void {
  fireEvent.change(nameField(code), { target: { value: 'Dana Cohen' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

const alertTexts = (): string[] =>
  screen.queryAllByRole('alert').map((node) => node.textContent.trim());

function messagesOf(field: HTMLElement): string[] {
  const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/);
  return ids
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => node?.getAttribute('role') === 'alert')
    .map((node) => node.textContent.trim());
}

const listIsOpen = (): boolean => screen.queryByRole('listbox') !== null;

/** What the list of FIRST-15 shows for `typed` in `code`, checked against the list file (D-117). */
function expectListFor(typed: string, code: string): void {
  const { listed, count } = expectedFor(typed);
  const shown = optionNames();
  expect(shown).toHaveLength(count);
  expect(shown.length).toBeLessThanOrEqual(CITY_SUGGESTIONS_LIMIT);
  // starting with the text first, the better-known (Russian-named) places first, then the list's order
  expect(shown).toEqual(listed.map((city) => shownName(city, code)));
}

/** Whether the place an option shows has a Russian name on the list (the better-known places). */
function optionHasRussianName(name: string, code: string, typed: string): boolean {
  const { starting } = expectedFor(typed);
  const place = starting.find((city) => shownName(city, code) === name);
  if (place === undefined) throw new Error(`${name} does not start with ${typed}`);
  return place.ru !== undefined;
}

// ---- FIRST-15: the list

describe.each(FORMS)('the city box of the %s form, what it lists (FIRST-15, D-117)', (form) => {
  it.each(LANGUAGE_CODES)('lists the places for what is typed, in %s', async (code) => {
    await openForm(form, code);
    await typeInCityBox(TYPED_IN[code], code);
    expect(optionNames().length).toBeGreaterThan(0);
    expectListFor(TYPED_IN[code], code);
  });

  // D-117: among the places whose name starts with the text, the ones with a Russian name come first
  it.each(LANGUAGE_CODES)(
    'lists Tel Aviv - Yafo among the options, and the places without a Russian name after those with one, in %s',
    async (code) => {
      await openForm(form, code);
      await typeInCityBox(TYPED_IN[code], code);
      const shown = optionNames();
      expect(shown).toContain(shownName(cityById(TEL_AVIV_ID), code));

      const flags = shown
        .slice(0, expectedFor(TYPED_IN[code]).starting.length)
        .map((name) => optionHasRussianName(name, code, TYPED_IN[code]));
      expect(flags.length).toBeGreaterThan(0);
      // no place without a Russian name stands before one that has it
      expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
      expect(flags[0]).toBe(true);
    }
  );

  it.each([
    ['tel', 'en'],
    ['תל', 'he'],
    ['تل', 'ar'],
  ])('lists Tel Aviv - Yafo for %s typed in the %s app', async (typed, code) => {
    await openForm(form, code);
    await typeInCityBox(typed, code);
    expect(optionNames()).toContain(shownName(cityById(TEL_AVIV_ID), code));
  });

  it('lists at most the limit of places, though more match', async () => {
    await openForm(form);
    await typeInCityBox('a');
    expect(expectedFor('a').matching.length).toBeGreaterThan(CITY_SUGGESTIONS_LIMIT);
    expect(optionNames()).toHaveLength(CITY_SUGGESTIONS_LIMIT);
  });

  it('finds Haifa typed in Latin letters in the Hebrew app, and shows the Hebrew name', async () => {
    await openForm(form, 'he');
    await typeInCityBox('haifa', 'he');
    expect(optionNames()).toContain(shownName(cityById(HAIFA_ID), 'he'));
    expectListFor('haifa', 'he');
  });

  it('finds a place by its name in any of the four languages', async () => {
    await openForm(form, 'en');
    for (const typed of ['חיפה', 'حيفا', 'Хайфа', 'Haifa']) {
      await typeInCityBox(typed);
      expect(optionNames(), typed).toContain('Haifa');
    }
  });

  it('ignores case, Hebrew points and Arabic marks', async () => {
    await openForm(form, 'en');
    await typeInCityBox('tel');
    const plain = optionNames();
    await typeInCityBox('TEL');
    expect(optionNames()).toEqual(plain);
    await typeInCityBox('  tEl  ');
    expect(optionNames()).toEqual(plain);
  });

  it('ignores Hebrew points', async () => {
    await openForm(form, 'he');
    await typeInCityBox('תל', 'he');
    const plain = optionNames();
    await typeInCityBox('תֵּל', 'he');
    expect(optionNames()).toEqual(plain);
  });

  it('ignores Arabic marks', async () => {
    await openForm(form, 'ar');
    await typeInCityBox('تل', 'ar');
    const plain = optionNames();
    await typeInCityBox('تَل', 'ar');
    expect(optionNames()).toEqual(plain);
  });

  it.each([
    ['an apostrophe left out', 'beer sheva', "Be'er Sheva"],
    ['an apostrophe typed', "be'er sheva", "Be'er Sheva"],
    ['a hyphen left out', 'tel aviv yafo', 'Tel Aviv - Yafo'],
    ['a hyphen typed', 'tel aviv - yafo', 'Tel Aviv - Yafo'],
    ['extra spaces', '  tel   aviv ', 'Tel Aviv - Yafo'],
  ])('ignores hyphens, apostrophes and extra spaces: %s', async (_name, typed, shown) => {
    await openForm(form);
    await typeInCityBox(typed);
    expect(optionNames()).toContain(shown);
  });

  it('shows what matches nothing as "No city matches" and lists no place', async () => {
    const typed = 'qqqzzzxxx';
    expect(expectedFor(typed).matching).toHaveLength(0);
    await openForm(form);
    await typeInCityBox(typed);
    expect(optionNames()).toEqual([]);
    expect(listIsOpen()).toBe(false);
    // other status regions exist on the page (the router probe): find ours by its words
    expect(screen.getAllByRole('status').map((node) => node.textContent.trim())).toContain(
      text('firstrun.city.noMatch')
    );
    expect(cityBox().getAttribute('aria-expanded')).not.toBe('true');
  });
});

describe.each(LANGUAGE_CODES)('what an option shows, in %s (FIRST-15, D-117)', (code) => {
  it.each([HAIFA_ID, TEL_AVIV_ID, NO_RUSSIAN_ID, NO_ARABIC_OR_RUSSIAN_ID])(
    'shows place %i in the app language, the English name where the list has none',
    async (id) => {
      await openForm('sign-up', code);
      const city = cityById(id);
      await typeInCityBox(city.en, code);
      expect(optionNames()).toContain(shownName(city, code));
    }
  );
});

// ---- FIRST-15: the box and the keys

describe.each(FORMS)('the city box of the %s form, roles and keys (FIRST-15, D-117)', (form) => {
  it('is a combobox with its label, hint and placeholder', async () => {
    await openForm(form);
    const field = cityBox();
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('aria-required')).toBe('true');
    expect(field.getAttribute('aria-autocomplete')).toBe('list');
    expect(field.getAttribute('aria-expanded')).not.toBe('true');
    expect(field.getAttribute('placeholder')).toBe(text('firstrun.city.placeholder'));
    expect(document.body.textContent).toContain(text('firstrun.city.hint'));
  });

  it('opens its list as soon as something is typed, and ties the list and the active option to the box', async () => {
    await openForm(form);
    await typeInCityBox('tel');
    const field = cityBox();
    expect(field.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { name: text('firstrun.city.label') });
    expect(field.getAttribute('aria-controls')).toBe(list.id);
    expect(list.tagName).toBe('UL');
    const first = screen.getAllByRole('option')[0];
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(field.getAttribute('aria-activedescendant')).toBe(first.id);
    expect(
      screen
        .getAllByRole('option')
        .filter((option) => option.getAttribute('aria-selected') === 'true')
    ).toHaveLength(1);
  });

  it('moves the active option with the arrow keys and keeps the box tied to it', async () => {
    await openForm(form);
    await typeInCityBox('tel');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(2);

    fireEvent.keyDown(cityBox(), { key: 'ArrowDown' });
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).not.toBe('true');
    expect(cityBox().getAttribute('aria-activedescendant')).toBe(options[1].id);

    fireEvent.keyDown(cityBox(), { key: 'ArrowDown' });
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(cityBox().getAttribute('aria-activedescendant')).toBe(options[2].id);

    fireEvent.keyDown(cityBox(), { key: 'ArrowUp' });
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(cityBox().getAttribute('aria-activedescendant')).toBe(options[1].id);
  });

  it('picks the active option with Enter, without sending the form, and closes the list', async () => {
    await openForm(form);
    await typeInCityBox('tel');
    const options = screen.getAllByRole('option');
    const second = options[1].textContent.trim();
    fireEvent.keyDown(cityBox(), { key: 'ArrowDown' });

    // a key whose default is prevented cannot submit the form
    const notPrevented = fireEvent.keyDown(cityBox(), { key: 'Enter' });
    await settleScreen();

    expect(notPrevented).toBe(false);
    expect(cityBox().value).toBe(second);
    expect(listIsOpen()).toBe(false);
    expect(cityBox().getAttribute('aria-expanded')).not.toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
    expect(alertTexts()).toEqual([]);
  });

  it('picks the first option with Enter when no arrow was pressed', async () => {
    await openForm(form);
    await typeInCityBox('haifa');
    fireEvent.keyDown(cityBox(), { key: 'Enter' });
    await settleScreen();
    expect(cityBox().value).toBe('Haifa');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  it('closes the list with Escape', async () => {
    await openForm(form);
    await typeInCityBox('tel');
    expect(listIsOpen()).toBe(true);
    fireEvent.keyDown(cityBox(), { key: 'Escape' });
    await settleScreen();
    expect(listIsOpen()).toBe(false);
    expect(cityBox().getAttribute('aria-expanded')).not.toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  it('picks with a tap: the box then shows the name and the list closes', async () => {
    await openForm(form);
    await typeInCityBox('tel aviv');
    const option = screen.getByRole('option', { name: 'Tel Aviv - Yafo' });
    // the box keeps focus: the press on an option is not allowed to take it
    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);
    await settleScreen();
    expect(cityBox().value).toBe('Tel Aviv - Yafo');
    expect(listIsOpen()).toBe(false);
    expect(cityBox().getAttribute('aria-invalid')).not.toBe('true');
  });

  it.each(LANGUAGE_CODES)(
    'shows the picked place in the language of the app, in %s',
    async (code) => {
      await openForm(form, code);
      await pickCity(
        shownName(cityById(TEL_AVIV_ID), code),
        shownName(cityById(TEL_AVIV_ID), code),
        code
      );
      expect(cityBox(code).value).toBe(shownName(cityById(TEL_AVIV_ID), code));
      expect(listIsOpen()).toBe(false);
    }
  );
});

// ---- FIRST-15: the request and the refusals

describe('the sign-up form and the city it sends (FIRST-15, FIRST-08, D-117)', () => {
  it.each(LANGUAGE_CODES)('sends city_id, the code of the tapped place, in %s', async (code) => {
    await open(NEW_MEMBER, code);
    fillRest(code);
    await pickCity('Haifa', shownName(cityById(HAIFA_ID), code), code);
    await pressIn(code, 'common.continue');

    const patches = callsOf('PATCH');
    expect(patches).toHaveLength(1);
    expect(bodyOfRequest(patches[0][1])).toEqual({
      display_name: 'Dana Cohen',
      city_id: HAIFA_ID,
      accept_terms: true,
    });
  });

  it('sends the code of a place that has no Russian name, in the Russian app', async () => {
    await open(NEW_MEMBER, 'ru');
    fillRest('ru');
    const city = cityById(NO_RUSSIAN_ID);
    await pickCity(city.en, city.en, 'ru');
    expect(cityBox('ru').value).toBe(city.en);
    await pressIn('ru', 'common.continue');

    const [patch] = callsOf('PATCH');
    expect(bodyOfRequest(patch[1])).toMatchObject({
      city_id: NO_RUSSIAN_ID,
    });
  });
});

describe.each(FORMS)('the %s form and a city that was not chosen (FIRST-15, D-117)', (form) => {
  const expectRefused = (): void => {
    expect(messagesOf(cityBox())).toEqual([text('firstrun.city.required')]);
    expect(cityBox().getAttribute('aria-invalid')).toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  };

  it('refuses text typed and not chosen, with "Choose a city from the list", and sends nothing', async () => {
    await openForm(form);
    fillRestFor(form);
    await typeInCityBox('Hai');
    await pressIn(ENGLISH_CODE, submitKey(form));
    expectRefused();
  });

  it('refuses a name typed in full but not tapped, though it is the name of a place', async () => {
    await openForm(form);
    fillRestFor(form);
    await typeInCityBox('Jerusalem');
    expect(optionNames()).toContain('Jerusalem');
    await pressIn(ENGLISH_CODE, submitKey(form));
    expectRefused();
  });

  it('drops a picked place when the member types again', async () => {
    await openForm(form);
    fillRestFor(form);
    await pickCity('Jerusalem', 'Jerusalem');
    expect(cityBox().value).toBe('Jerusalem');
    await typeInCityBox('Jerusalemx');
    await pressIn(ENGLISH_CODE, submitKey(form));
    expectRefused();
  });

  it('refuses a cleared city', async () => {
    await openForm(form);
    fillRestFor(form);
    await pickCity('Jerusalem', 'Jerusalem');
    expect(cityBox().value).toBe('Jerusalem');
    await typeInCityBox('');
    expect(cityBox().value).toBe('');
    expect(listIsOpen()).toBe(false);
    await pressIn(ENGLISH_CODE, submitKey(form));
    expectRefused();
  });

  it('accepts the place chosen again after a refusal, and sends its code', async () => {
    await openForm(form);
    fillRestFor(form);
    await typeInCityBox('Hai');
    await pressIn(ENGLISH_CODE, submitKey(form));
    expectRefused();

    await pickCity('Jerusalem', 'Jerusalem');
    await pressIn(ENGLISH_CODE, submitKey(form));

    const patches = callsOf('PATCH');
    expect(patches).toHaveLength(1);
    expect(bodyOfRequest(patches[0][1])).toMatchObject({
      city_id: cityByEnglishName('Jerusalem').id,
    });
  });
});

/** The sign-up form needs a name and the box; the edit form already has a name. */
function fillRestFor(form: Form): void {
  if (form === 'sign-up') fillRest();
}

function cityByEnglishName(name: string) {
  const found = CITIES.find((city) => city.en === name);
  if (found === undefined) throw new Error(`no city ${name} on the list`);
  return found;
}

// ---- FIRST-15: the list file loads on need

describe('the city list file loads only for a screen that has the box (FIRST-15, ME-19, D-117)', () => {
  it('is not loaded by the public pages or the signed-in home screen', async () => {
    await renderAppAtPath(<App />, '/');
    await settleScreen();
    cleanup();
    expect(listFile.loads).toBe(0);

    await open(MEMBER, ENGLISH_CODE, MEMBER_HOME_PATH);
    expect(listFile.loads).toBe(0);
  });

  it.each(['sign-up', 'profile'])(
    'is loaded when the %s screen opens, with no /api/ call for it',
    async (screenName) => {
      await open(screenName === 'sign-up' ? NEW_MEMBER : MEMBER);
      expect(listFile.loads).toBeGreaterThan(0);
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls.filter((url) => url.toLowerCase().includes('cit'))).toEqual([]);
    }
  );

  it(
    'says the profile is unavailable when the list file cannot be loaded',
    async () => {
      listFile.fails = true;
      await open(NEW_MEMBER);
      await typeInCityBox('tel');
      await waitFor(
        () => {
          expect(document.body.textContent).toContain(text('profile.error.unavailable'));
        },
        { timeout: FAILED_LOAD_WAIT_MS }
      );
      expect(optionNames()).toEqual([]);
    },
    FAILED_LOAD_TEST_TIMEOUT_MS
  );
});

// ---- ME-19: the city line of Profile

const PROFILE_PLACES = [HAIFA_ID, TEL_AVIV_ID, NO_RUSSIAN_ID, NO_ARABIC_OR_RUSSIAN_ID];

/** The city line: the paragraph under the member's name, its text inside a `bdi`. */
const cityLine = (): string => document.querySelector('p bdi')?.textContent.trim() ?? '';

describe.each(LANGUAGE_CODES)('the city line of Profile, in %s (ME-19, D-117)', (code) => {
  it.each(PROFILE_PLACES)(
    'shows place %i in the app language, the English name where the list has none',
    async (id) => {
      await open({ ...MEMBER, city_id: id }, code);
      expect(cityLine()).toBe(shownName(cityById(id), code));
      expect(cityLine()).not.toBe('');
    }
  );

  it('shows no city text for a member with no city_id', async () => {
    await open({ ...MEMBER, city_id: null }, code);
    expect(cityLine()).toBe('');
  });

  it.each(PROFILE_PLACES)("starts the edit form's box with place %i", async (id) => {
    await open({ ...MEMBER, city_id: id }, code);
    await pressIn(code, 'profile.edit.title');
    expect(cityBox(code).value).toBe(shownName(cityById(id), code));
  });

  it("starts the edit form's box empty for a member with no city_id", async () => {
    await open({ ...MEMBER, city_id: null }, code);
    await pressIn(code, 'profile.edit.title');
    expect(cityBox(code).value).toBe('');
  });
});

/** The app with all four locale files in its i18n, so the Language row can switch with no request. */
async function openWithAllLanguages(answerWith: ProfileResponse, code: string): Promise<void> {
  profile = answerWith;
  fakeUserManager.setUser(makeUser());
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
      <MemoryRouter initialEntries={['/profile']}>
        <App />
        <RouterLocationProbe />
      </MemoryRouter>
    </I18nextProvider>
  );
  await settleScreen();
}

async function switchLanguage(from: string, to: string): Promise<void> {
  const settings = screen.getByRole('region', { name: text('profile.settings.title', from) });
  const row = within(settings).getByRole('button', {
    name: (name) => name.includes(text('profile.settings.language', from)),
  });
  fireEvent.click(row);
  await settleScreen();
  const dialog = screen.getByRole('dialog', { name: text('lang.choose', from) });
  const target = within(dialog)
    .getAllByRole('button')
    .find((button) => button.getAttribute('lang') === to);
  if (target === undefined) throw new Error(`no button for ${to}`);
  fireEvent.click(target);
  await settleScreen();
}

describe('the city line follows the Language row (ME-19, ME-16, D-117)', () => {
  it.each(PROFILE_PLACES)(
    'changes the name of place %i with each language the member switches to',
    async (id) => {
      await openWithAllLanguages({ ...MEMBER, city_id: id }, ENGLISH_CODE);
      let current = ENGLISH_CODE;
      expect(cityLine()).toBe(shownName(cityById(id), current));

      for (const language of LANGUAGE_CODES.filter((one) => one !== ENGLISH_CODE)) {
        await switchLanguage(current, language);
        current = language;
        expect(cityLine(), language).toBe(shownName(cityById(id), language));
      }
      await switchLanguage(current, ENGLISH_CODE);
      expect(cityLine()).toBe(shownName(cityById(id), ENGLISH_CODE));
    }
  );

  it('shows no city text before and after a switch for a member with no city_id', async () => {
    await openWithAllLanguages({ ...MEMBER, city_id: null }, ENGLISH_CODE);
    expect(cityLine()).toBe('');
    await switchLanguage(ENGLISH_CODE, 'he');
    expect(cityLine()).toBe('');
  });
});
