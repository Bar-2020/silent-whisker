// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { ENGLISH_CODE, getLocaleText, LANGUAGE_CODES } from '@shared/test-support/locale-texts';
import { answerCityFile, isCityFileUrl } from '@shared/test-support/city-files-fake';
import {
  cityBox,
  HAIFA_ID,
  JERUSALEM_ID,
  pickCity,
  typeInCityBox,
} from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { readCurrentPath } from '@shared/test-support/router-location';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import {
  FAKE_COGNITO_DOMAIN,
  ID_TOKEN,
  jsonResponse,
  makeUser,
  PROFILE,
} from '@shared/test-support/sign-in-fakes';
import type { ProfileResponse } from '@schemas/profile.schema';
import { CONTACT_EMAIL } from '@constants/contact';
import { INSTALL_STEP_DONE_STORAGE_KEY } from '@constants/first-run';
import {
  API_PATH_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  STATUS_BAD_REQUEST,
  STATUS_FORBIDDEN,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_SERVER_ERROR,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAVAILABLE,
  STATUS_UNPROCESSABLE,
} from '@constants/http';
import {
  AVATAR_INITIALS_COUNT,
  GOOGLE_IMAGE_HOST_SUFFIX,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
} from '@constants/profile';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const GOOGLE_PHOTO = `https://lh3${GOOGLE_IMAGE_HOST_SUFFIX}/a/photo=s96`;
const BROKEN_PHOTO = `https://lh3${GOOGLE_IMAGE_HOST_SUFFIX}/a/broken`;
const RETRY_AFTER = DEFAULT_RETRY_AFTER_SECONDS + 5;
const SETTLE_ROUNDS = 6;
/** Two hours: a wait the daily save limit must not write out (FIRST-09, D-108). */
const DAILY_LIMIT_RETRY_AFTER = 7200;

const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);

/** A picture claim that does not count as a Google photo (D-108). */
const NOT_A_GOOGLE_PHOTO: [string, string][] = [
  ['another host', 'https://example.test/photo.jpg'],
  ['a host that only starts like Google', `https://lh3${GOOGLE_IMAGE_HOST_SUFFIX}.evil.example/a`],
  ['plain http', `http://lh3${GOOGLE_IMAGE_HOST_SUFFIX}/a/photo`],
];

// D-116: a full name is letters of the four languages
const NAMES_IN_SCRIPTS = ['דנה כהן', 'سارة أحمد', 'Иван Петров'];

/** A text of `length` letters no letter of which comes three times in a row (D-116). */
const letters = (length: number): string => 'dana'.repeat(length).slice(0, length);

const NEW_MEMBER: ProfileResponse = {
  ...PROFILE,
  display_name: null,
  city_id: null,
  terms_accepted: false,
};
const BANNED_NEW_MEMBER: ProfileResponse = { ...NEW_MEMBER, status: 'banned' };
const MEMBER: ProfileResponse = {
  ...PROFILE,
  display_name: 'Dana Levi',
  city_id: HAIFA_ID,
  avatar_url: GOOGLE_PHOTO,
  show_google_photo: true,
};

const SAID_NO: ProfileResponse = { ...MEMBER, show_google_photo: false, avatar_url: null };

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;

/** What `GET /profile` answers now, and the answers `PATCH /profile` gives in turn. */
let profile: ProfileResponse;
let patchQueue: Answer[] = [];
/** Called when `GET /profile` is asked, before it is answered (FIRST-10). */
let onProfileRequest: (() => void) | undefined;

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

const methodOf = (init?: RequestInit): string => (init?.method ?? 'GET').toUpperCase();

beforeEach(async () => {
  vi.resetModules();
  const seam = await import('@shared/auth/user-manager');
  if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
  fakeUserManager = seam.userManager;
  ({ App } = await import('@app/App'));
  fakeUserManager.reset();
  sessionStorage.clear();
  localStorage.clear();
  // FIRST-11, D-110: without the install flag the install step takes the place of every page
  localStorage.setItem(INSTALL_STEP_DONE_STORAGE_KEY, 'true');
  profile = MEMBER;
  patchQueue = [];
  onProfileRequest = undefined;
  fetchMock.mockReset();
  fetchMock.mockImplementation((url, init) => {
    const cityFile = answerCityFile(url);
    if (cityFile !== undefined) return Promise.resolve(cityFile);
    if (methodOf(init) !== 'PATCH') {
      onProfileRequest?.();
      return Promise.resolve(jsonResponse(STATUS_OK, profile));
    }
    const next = patchQueue.shift();
    return next === undefined ? Promise.reject(new Error('unexpected PATCH')) : next();
  });
  vi.stubGlobal('fetch', fetchMock);
  replace.mockReset();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/`, replace });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---- the server's side

type Answer = () => Promise<Response>;

function answer(status: number, body?: unknown, headers: Record<string, string> = {}): Answer {
  return () => Promise.resolve(jsonResponse(status, body, headers));
}

function refuse(status: number, code: string, headers: Record<string, string> = {}): Answer {
  return answer(status, { code }, headers);
}

function accept(saved: ProfileResponse): Answer {
  return answer(STATUS_OK, saved);
}

/** An answer that waits until the test lets it go. */
function held(): { answer: Answer; release: (response: Response) => void } {
  let release: (response: Response) => void = () => undefined;
  const waiting = new Promise<Response>((done) => {
    release = done;
  });
  return { answer: () => waiting, release };
}

const offline = (): Promise<Response> => Promise.reject(new TypeError('Failed to fetch'));

type Call = [url: string, init?: RequestInit];

/** The calls of the profile API: the city files (D-117) are fetched too, with GET, and are not counted. */
const callsOf = (method: string): Call[] =>
  fetchMock.mock.calls.filter(([url, init]) => methodOf(init) === method && !isCityFileUrl(url));

const bodySchema = z.record(z.string(), z.unknown());

function bodyOf(call: Call): Record<string, unknown> {
  const body = call[1]?.body;
  if (typeof body !== 'string') throw new Error('the body is not JSON text');
  return bodySchema.parse(JSON.parse(body));
}

// ---- the screen

const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;

const buttonNamed = (key: string): HTMLElement =>
  screen.getByRole('button', { name: getLocaleText(ENGLISH_CODE, key) });
const maybeButton = (key: string): HTMLElement | null =>
  screen.queryByRole('button', { name: getLocaleText(ENGLISH_CODE, key) });

function input(key: string): HTMLInputElement {
  const found = screen.getByRole('textbox', { name: getLocaleText(ENGLISH_CODE, key) });
  if (!(found instanceof HTMLInputElement)) throw new Error(`${key} is not an input`);
  return found;
}

const NAME = 'firstrun.name.label';
/** Haifa in the language of the screen (the English app shows the English names). */
const HAIFA_NAME = 'Haifa';

function box(): HTMLInputElement {
  const found = screen.getByRole('checkbox');
  if (!(found instanceof HTMLInputElement)) throw new Error('the terms box is not an input');
  return found;
}

function radio(key: string): HTMLInputElement {
  const found = screen.getByRole('radio', { name: getLocaleText(ENGLISH_CODE, key) });
  if (!(found instanceof HTMLInputElement)) throw new Error(`${key} is not an input`);
  return found;
}

const radios = (): HTMLElement[] => screen.queryAllByRole('radio');
const alerts = (): HTMLElement[] => screen.queryAllByRole('alert');
const alertTexts = (): string[] => alerts().map((node) => node.textContent.trim());

/** The messages tied to a field by `aria-describedby`. */
function alertsOf(field: HTMLElement): HTMLElement[] {
  const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/);
  const nodes = ids.map((id) => document.getElementById(id));
  return nodes.filter((node): node is HTMLElement => node?.getAttribute('role') === 'alert');
}

const messagesOf = (field: HTMLElement): string[] =>
  alertsOf(field).map((node) => node.textContent.trim());

function type(field: HTMLInputElement, value: string): void {
  fireEvent.change(field, { target: { value } });
}

async function press(key: string): Promise<void> {
  fireEvent.click(buttonNamed(key));
  await settleScreen();
}

/** A text with its `{{...}}` placeholders filled in. */
function words(key: string, values: Record<string, string> = {}): string {
  const filled: Record<string, string> = {
    min: String(PROFILE_NAME_MIN_LENGTH),
    max: String(PROFILE_NAME_MAX_LENGTH),
    ...values,
  };
  return getLocaleText(ENGLISH_CODE, key).replace(
    /\{\{(\w+)\}\}/g,
    (whole, name: string) => filled[name] ?? whole
  );
}

/** The one placeholder of a text, whatever its name, filled with `value`. */
const withValue = (key: string, value: string): string =>
  getLocaleText(ENGLISH_CODE, key).replace(/\{\{\w+\}\}/g, value);

const noticeShown = (): boolean =>
  document.body.textContent.includes(getLocaleText(ENGLISH_CODE, 'common.banned.title')) &&
  document.body.textContent.includes(getLocaleText(ENGLISH_CODE, 'common.banned.text'));

function signIn(picture?: string): void {
  fakeUserManager.setUser(makeUser({ picture }));
}

async function open(
  answerWith: ProfileResponse,
  path = '/profile',
  picture?: string
): Promise<void> {
  profile = answerWith;
  signIn(picture);
  await renderAppAtPath(<App />, path);
  await settleScreen();
}

/** Fill the sign-up form with values that pass the checks: the city is picked from the list (D-117). */
async function fillSignUp({ name = 'Dana Cohen', tick = true } = {}): Promise<void> {
  type(input(NAME), name);
  await pickCity('Haifa', HAIFA_NAME);
  if (tick) fireEvent.click(box());
}

// ---- FIRST-02

describe('the sign-up form, what it shows', () => {
  // FIRST-02, D-69, D-27, D-61: the fields, no error before the first press, a photo question that waits for an answer
  it('shows the form with a photo question, no answer chosen and no error', async () => {
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
    expect(input(NAME).value).toBe('');
    expect(cityBox().value).toBe('');
    expect(
      screen.getByRole('group', { name: getLocaleText(ENGLISH_CODE, 'firstrun.photo.label') })
    ).toBeDefined();
    expect(radios()).toHaveLength(2);
    expect(radio('firstrun.photo.yes').checked).toBe(false);
    expect(radio('firstrun.photo.no').checked).toBe(false);
    expect(box().checked).toBe(false);
    expect(alerts()).toHaveLength(0);
    expect(maybeButton('common.continue')).not.toBeNull();
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // FIRST-02, D-27: no Google photo in the token, no question
  it('does not ask about a photo when the token has none', async () => {
    await open(NEW_MEMBER);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
    expect(radios()).toHaveLength(0);
    expect(
      screen.queryByRole('group', { name: getLocaleText(ENGLISH_CODE, 'firstrun.photo.label') })
    ).toBeNull();
  });

  // FIRST-02, D-27, D-108: only a Google https picture counts
  it.each(NOT_A_GOOGLE_PHOTO)(
    'does not ask about a photo for a picture on %s',
    async (_name, picture) => {
      await open(NEW_MEMBER, '/profile', picture);
      expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
      expect(radios()).toHaveLength(0);
    }
  );

  // FIRST-02, D-69: the sentence links the terms and the privacy policy, each in a new tab
  it('links the terms and the privacy policy from the box, in a new tab', async () => {
    await open(NEW_MEMBER);
    for (const path of ['/terms', '/privacy']) {
      const link = document.querySelector(`a[href="${path}"]`);
      expect(link).not.toBeNull();
      expect(link?.getAttribute('target')).toBe('_blank');
    }
  });

  // FIRST-02, D-69: the form is in the member's language
  it.each(LANGUAGE_CODES)('has its heading in %s', async (code) => {
    profile = NEW_MEMBER;
    signIn();
    await renderAppAtPath(<App />, '/profile', code);
    await settleScreen();
    expect(heading1()).toBe(getLocaleText(code, 'firstrun.profile.h1'));
  });
});

describe('the sign-up form, what it refuses', () => {
  // FIRST-02, A11Y-05, D-69, D-27, D-61: every missing answer is said in words under its field and nothing is sent
  it('says what is missing under each field after the first press, and sends nothing', async () => {
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    await press('common.continue');

    expect(messagesOf(input(NAME))).toEqual([
      getLocaleText(ENGLISH_CODE, 'firstrun.name.required'),
    ]);
    // D-117: nothing picked from the list is "Choose a city from the list"
    expect(messagesOf(cityBox())).toEqual([getLocaleText(ENGLISH_CODE, 'firstrun.city.required')]);
    // the question as a whole carries the message: its group, or else an answer
    const question = screen.getByRole('group', {
      name: getLocaleText(ENGLISH_CODE, 'firstrun.photo.label'),
    });
    expect([
      ...messagesOf(question),
      ...messagesOf(radio('firstrun.photo.yes')),
      ...messagesOf(radio('firstrun.photo.no')),
    ]).toContain(getLocaleText(ENGLISH_CODE, 'firstrun.photo.required'));
    expect(messagesOf(box())).toEqual([getLocaleText(ENGLISH_CODE, 'firstrun.terms.required')]);
    expect(input(NAME).getAttribute('aria-invalid')).toBe('true');
    expect(cityBox().getAttribute('aria-invalid')).toBe('true');
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // FIRST-02, D-27: with no photo question there is no photo message
  it('does not ask for a photo answer when there is no photo', async () => {
    await open(NEW_MEMBER);
    await press('common.continue');
    expect(document.body.textContent).not.toContain(
      getLocaleText(ENGLISH_CODE, 'firstrun.photo.required')
    );
    expect(alerts()).toHaveLength(3);
  });

  // FIRST-02, D-69: only the box unticked: only the box is wrong, and nothing is sent
  it('with only the box unticked, marks only the box', async () => {
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    await fillSignUp({ tick: false });
    fireEvent.click(radio('firstrun.photo.no'));
    await press('common.continue');

    expect(alertTexts()).toEqual([getLocaleText(ENGLISH_CODE, 'firstrun.terms.required')]);
    expect(messagesOf(box())).toEqual([getLocaleText(ENGLISH_CODE, 'firstrun.terms.required')]);
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(input(NAME).getAttribute('aria-invalid')).not.toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // FIRST-02: the photo question, answered, is no longer missing
  it('with only the photo unanswered, marks only the photo question', async () => {
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    await fillSignUp();
    await press('common.continue');
    expect(alertTexts()).toEqual([getLocaleText(ENGLISH_CODE, 'firstrun.photo.required')]);
    expect(callsOf('PATCH')).toHaveLength(0);

    fireEvent.click(radio('firstrun.photo.yes'));
    expect(radio('firstrun.photo.yes').checked).toBe(true);
    expect(radio('firstrun.photo.no').checked).toBe(false);
  });

  // FIRST-02, D-69: a filled form shows no error and sends its one request
  it('shows no error for a filled form', async () => {
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    patchQueue.push(accept({ ...MEMBER }));
    await fillSignUp();
    fireEvent.click(radio('firstrun.photo.yes'));
    await press('common.continue');
    expect(alerts()).toHaveLength(0);
    expect(callsOf('PATCH')).toHaveLength(1);
  });

  // FIRST-02, D-61, D-92, D-116: the length is counted in characters, edges from the constants
  describe('the name', () => {
    it.each([
      ['one under the minimum', PROFILE_NAME_MIN_LENGTH - 1, false],
      ['the minimum', PROFILE_NAME_MIN_LENGTH, true],
      ['the maximum', PROFILE_NAME_MAX_LENGTH, true],
      ['one over the maximum', PROFILE_NAME_MAX_LENGTH + 1, false],
    ])('of %s characters', async (_name, length, accepted) => {
      await open(NEW_MEMBER);
      patchQueue.push(accept(MEMBER));
      await fillSignUp();
      type(input(NAME), letters(length));
      await press('common.continue');
      if (accepted) {
        expect(alerts()).toHaveLength(0);
        expect(callsOf('PATCH')).toHaveLength(1);
      } else {
        expect(messagesOf(input(NAME))).toEqual([words('firstrun.name.invalid')]);
        expect(input(NAME).getAttribute('aria-invalid')).toBe('true');
        expect(callsOf('PATCH')).toHaveLength(0);
      }
    });

    // FIRST-02, D-61: spaces are not text
    it('of only spaces is refused and nothing is sent', async () => {
      await open(NEW_MEMBER);
      await fillSignUp();
      type(input(NAME), ' '.repeat(PROFILE_NAME_MAX_LENGTH));
      await press('common.continue');
      expect(input(NAME).getAttribute('aria-invalid')).toBe('true');
      expect(callsOf('PATCH')).toHaveLength(0);
    });

    // FIRST-02, D-61: the length is the length after trimming
    it('with spaces around a text of the minimum length is accepted', async () => {
      await open(NEW_MEMBER);
      patchQueue.push(accept(MEMBER));
      await fillSignUp();
      type(input(NAME), ` ${letters(PROFILE_NAME_MIN_LENGTH)} `);
      await press('common.continue');
      expect(callsOf('PATCH')).toHaveLength(1);
    });
  });

  // FIRST-02, FIRST-14, D-116: a name is never emoji; the length message wins only when the length is wrong
  it.each([
    ['the maximum', PROFILE_NAME_MAX_LENGTH, 'firstrun.name.notName'],
    ['one over the maximum', PROFILE_NAME_MAX_LENGTH + 1, 'firstrun.name.invalid'],
  ])('the name of %s emoji is refused and nothing is sent', async (_name, length, key) => {
    await open(NEW_MEMBER);
    await fillSignUp();
    type(input(NAME), '🐱'.repeat(length));
    await press('common.continue');
    expect(messagesOf(input(NAME))).toEqual([words(key, { min: String(PROFILE_NAME_MIN_LENGTH) })]);
    expect(callsOf('PATCH')).toHaveLength(0);
  });
});

// ---- FIRST-03

describe('pressing Continue twice', () => {
  // FIRST-03, D-57: one request; a spinner while the answer is on its way; the page after it
  it('sends one request and shows the button busy while the answer waits', async () => {
    const pending = held();
    patchQueue.push(pending.answer);
    await open(NEW_MEMBER);
    await fillSignUp();
    expect(buttonNamed('common.continue').getAttribute('aria-busy')).not.toBe('true');

    fireEvent.click(buttonNamed('common.continue'));
    fireEvent.click(buttonNamed('common.continue'));
    await settleScreen();
    expect(buttonNamed('common.continue').getAttribute('aria-busy')).toBe('true');
    fireEvent.click(buttonNamed('common.continue'));
    await settleScreen();
    expect(callsOf('PATCH')).toHaveLength(1);

    pending.release(jsonResponse(STATUS_OK, MEMBER));
    await settleScreen();
    expect(callsOf('PATCH')).toHaveLength(1);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(maybeButton('common.continue')).toBeNull();
  });
});

// ---- FIRST-07

describe('the sign-up form takes the place of the page', () => {
  // FIRST-07, R-36, D-69, D-108: terms not accepted: the form, whatever the address, and the address stays
  it.each(['/profile', '/nowhere/at/all', '/spots/x'])('shows the form at %s', async (path) => {
    await open(NEW_MEMBER, path);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
    expect(readCurrentPath()).toBe(path);
    expect(
      screen.queryByRole('heading', { name: getLocaleText(ENGLISH_CODE, 'profile.heading') })
    ).toBeNull();
  });

  // FIRST-07, R-36, D-69, D-108: terms accepted: the page
  it('shows the profile page once the terms are accepted', async () => {
    await open(MEMBER);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(maybeButton('common.continue')).toBeNull();
    expect(callsOf('GET')).toHaveLength(1);
  });

  // FIRST-07, R-36, D-69, D-108: terms accepted, any other address: not the form
  it('shows no form at an unknown address once the terms are accepted', async () => {
    await open(MEMBER, '/nowhere/at/all');
    expect(heading1()).not.toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
    expect(maybeButton('common.continue')).toBeNull();
    expect(readCurrentPath()).toBe('/nowhere/at/all');
  });

  // FIRST-07, R-36, R-08, D-69, D-72, D-108: banned and not accepted: the form, the permanent notice, Sign out
  it('shows a banned member the form with the permanent notice and a Sign out button', async () => {
    await open(BANNED_NEW_MEMBER);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
    expect(noticeShown()).toBe(true);
    expect(maybeButton('profile.signOut')).not.toBeNull();
    expect(readCurrentPath()).toBe('/profile');
  });

  // FIRST-07, D-72, D-59: Sign out on the form signs out
  it('signs out from the form', async () => {
    await open(NEW_MEMBER);
    await press('profile.signOut');
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    const url = new URL(replace.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(`${FAKE_COGNITO_DOMAIN}/logout`);
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // FIRST-07, R-08, D-72, D-108: a banned member who presses Continue is refused, and the notice stays
  it('keeps the notice when a banned member presses Continue', async () => {
    patchQueue.push(refuse(STATUS_FORBIDDEN, 'BANNED'));
    await open(BANNED_NEW_MEMBER);
    await fillSignUp();
    await press('common.continue');
    expect(callsOf('PATCH')).toHaveLength(1);
    expect(noticeShown()).toBe(true);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'firstrun.profile.h1'));
  });
});

// ---- FIRST-08

describe('saving the sign-up form', () => {
  // FIRST-08, D-27, D-69, D-101, D-108: with a Google photo, one PATCH with everything, then the page
  it('sends one PATCH with the token, the trimmed text and the photo answer, then the page', async () => {
    const saved = { ...MEMBER, display_name: 'Dana Cohen', city_id: HAIFA_ID };
    patchQueue.push(accept(saved));
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    type(input(NAME), '   Dana Cohen  ');
    await pickCity('Haifa', HAIFA_NAME);
    fireEvent.click(radio('firstrun.photo.yes'));
    fireEvent.click(box());
    await press('common.continue');

    const patches = callsOf('PATCH');
    expect(patches).toHaveLength(1);
    const [url, init] = patches[0];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(headers.get('content-type')).toBe('application/json');
    // FIRST-15, D-117: the request carries city_id, the code of the picked place, and no text city
    expect(bodyOf(patches[0])).toEqual({
      display_name: 'Dana Cohen',
      city_id: HAIFA_ID,
      show_google_photo: true,
      accept_terms: true,
    });

    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(maybeButton('common.continue')).toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Cohen');
    // the saved answer replaced the cached profile: no second GET
    expect(callsOf('GET')).toHaveLength(1);
  });

  // FIRST-08, D-27: "no" is sent as false
  it('sends show_google_photo false for the answer no', async () => {
    patchQueue.push(accept({ ...MEMBER, show_google_photo: false, avatar_url: null }));
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    await fillSignUp();
    fireEvent.click(radio('firstrun.photo.no'));
    await press('common.continue');
    expect(bodyOf(callsOf('PATCH')[0])).toEqual({
      display_name: 'Dana Cohen',
      city_id: HAIFA_ID,
      show_google_photo: false,
      accept_terms: true,
    });
  });

  // FIRST-08, D-27, D-108: no photo in the token: no question and no show_google_photo
  it('sends no show_google_photo when the token has no photo', async () => {
    patchQueue.push(accept({ ...MEMBER, show_google_photo: false, avatar_url: null }));
    await open(NEW_MEMBER);
    type(input(NAME), '  Dana Cohen ');
    await pickCity('Haifa', HAIFA_NAME);
    fireEvent.click(box());
    await press('common.continue');
    const patches = callsOf('PATCH');
    expect(patches).toHaveLength(1);
    expect(bodyOf(patches[0])).toEqual({
      display_name: 'Dana Cohen',
      city_id: HAIFA_ID,
      accept_terms: true,
    });
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
  });

  // FIRST-08, D-101: the text is sent in NFC, as the schema says
  it('sends the name in NFC', async () => {
    patchQueue.push(accept(MEMBER));
    await open(NEW_MEMBER);
    await fillSignUp({ name: 'Café Levi' });
    await press('common.continue');
    expect(bodyOf(callsOf('PATCH')[0]).display_name).toBe('Café Levi');
  });

  // FIRST-08, D-61: Hebrew, Arabic, Russian and emoji go out as they were typed
  it.each(NAMES_IN_SCRIPTS)('sends the name %s as typed', async (name) => {
    patchQueue.push(accept(MEMBER));
    await open(NEW_MEMBER);
    await fillSignUp({ name });
    await press('common.continue');
    expect(bodyOf(callsOf('PATCH')[0]).display_name).toBe(name);
  });
});

// ---- FIRST-09, ME-08: the same refusals under the same fields, in the sign-up form and in the edit form

interface Refusal {
  name: string;
  answer: () => Promise<Response>;
  /** Under which field the message sits: `form` is above the buttons; `banned` is the notice. */
  where: 'name' | 'form' | 'banned';
  message: string;
}

const REFUSALS: Refusal[] = [
  {
    name: 'INVALID_INPUT',
    answer: refuse(STATUS_BAD_REQUEST, 'INVALID_INPUT'),
    where: 'form',
    message: words('profile.error.invalid'),
  },
  {
    name: 'MODERATION_REJECTED',
    answer: refuse(STATUS_UNPROCESSABLE, 'MODERATION_REJECTED'),
    where: 'name',
    message: '',
  },
  {
    name: 'PROFILE_SAVE_DAILY_LIMIT with Retry-After',
    answer: refuse(STATUS_TOO_MANY_REQUESTS, 'PROFILE_SAVE_DAILY_LIMIT', {
      'retry-after': String(DAILY_LIMIT_RETRY_AFTER),
    }),
    where: 'form',
    message: words('profile.error.dailyLimit'),
  },
  {
    name: 'a bare 429',
    answer: answer(STATUS_TOO_MANY_REQUESTS),
    where: 'form',
    message: withValue('common.rateLimit.text', String(DEFAULT_RETRY_AFTER_SECONDS)),
  },
  {
    name: 'RATE_LIMITED with Retry-After',
    answer: refuse(STATUS_TOO_MANY_REQUESTS, 'RATE_LIMITED', {
      'retry-after': String(RETRY_AFTER),
    }),
    where: 'form',
    message: withValue('common.rateLimit.text', String(RETRY_AFTER)),
  },
  {
    name: 'CHECK_UNAVAILABLE',
    answer: refuse(STATUS_UNAVAILABLE, 'CHECK_UNAVAILABLE'),
    where: 'form',
    message: words('profile.error.checkUnavailable'),
  },
  {
    name: 'a bare 503',
    answer: answer(STATUS_UNAVAILABLE),
    where: 'form',
    message: words('profile.error.unavailable'),
  },
  {
    name: 'a 5xx with no code',
    answer: answer(STATUS_SERVER_ERROR),
    where: 'form',
    message: words('profile.error.unavailable'),
  },
  {
    name: 'no connection',
    answer: offline,
    where: 'form',
    message: words('profile.error.unavailable'),
  },
  {
    name: 'a refusal the app does not know',
    answer: refuse(STATUS_NOT_FOUND, 'NOT_FOUND'),
    where: 'form',
    message: words('profile.error.generic'),
  },
  {
    name: 'BANNED',
    answer: refuse(STATUS_FORBIDDEN, 'BANNED'),
    where: 'banned',
    message: '',
  },
];

/** The refusals that a typed character clears: the banned notice is permanent. */
const FIELD_REFUSALS = REFUSALS.filter((refusal) => refusal.where !== 'banned');

/** Texts of the plain messages, to prove a refusal shows its own and not another one. */
const PLAIN_MESSAGES = [
  'profile.error.invalid',
  'profile.error.checkUnavailable',
  'profile.error.unavailable',
  'profile.error.generic',
].map((key) => words(key));

const EDITED_NAME = 'Dana Cohen';

interface FormDriver {
  title: string;
  submit: string;
  /** Opens the form and puts values in it that would be saved. */
  prepare: () => Promise<void>;
  /** The page or form after a good save. */
  savedScreenShown: () => boolean;
}

const DRIVERS: FormDriver[] = [
  {
    title: 'the sign-up form',
    submit: 'common.continue',
    async prepare() {
      await open(NEW_MEMBER);
      await fillSignUp({ name: EDITED_NAME });
    },
    savedScreenShown: () => heading1() === getLocaleText(ENGLISH_CODE, 'profile.heading'),
  },
  {
    title: 'the edit form',
    submit: 'common.save',
    async prepare() {
      await open(MEMBER);
      await press('profile.edit.title');
      type(input(NAME), EDITED_NAME);
    },
    savedScreenShown: () => maybeButton('profile.edit.title') !== null,
  },
];

describe.each(DRIVERS)('$title, when the server refuses', (driver) => {
  const saved = { ...MEMBER, display_name: EDITED_NAME };

  // FIRST-09, ME-08, D-62, D-61, D-72, D-74, D-60, A11Y-05: each refusal its own plain message, where it belongs
  it.each(REFUSALS)('$name shows its own message', async (refusal) => {
    patchQueue.push(refusal.answer);
    await driver.prepare();
    await press(driver.submit);
    expect(callsOf('PATCH')).toHaveLength(1);

    if (refusal.where === 'banned') {
      expect(noticeShown()).toBe(true);
      for (const plain of PLAIN_MESSAGES) expect(document.body.textContent).not.toContain(plain);
      return;
    }
    if (refusal.where === 'name') {
      // MODERATION_REJECTED: the refused text names the contact address, under the name
      const under = alertsOf(input(NAME));
      expect(under).toHaveLength(1);
      const mail = under[0].querySelector('a[href^="mailto:"]');
      expect(mail?.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}`);
      expect(under[0].textContent).not.toMatch(/\{\{|</);
      expect(input(NAME).getAttribute('aria-invalid')).toBe('true');
    } else {
      const shown = alerts().filter((node) => node.textContent.includes(refusal.message));
      expect(shown).toHaveLength(1);
      // above the buttons, not tied to a field
      const position = shown[0].compareDocumentPosition(buttonNamed(driver.submit));
      expect(position).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(messagesOf(input(NAME))).toEqual([]);
      expect(messagesOf(cityBox())).toEqual([]);
    }
    for (const plain of PLAIN_MESSAGES.filter((other) => other !== refusal.message)) {
      expect(document.body.textContent).not.toContain(plain);
    }
  });

  // FIRST-09, ME-08, D-62: the typed values stay and the button works again
  it.each(REFUSALS)('$name keeps the typed values and the button works again', async (refusal) => {
    patchQueue.push(refusal.answer, accept(saved));
    await driver.prepare();
    await press(driver.submit);

    expect(input(NAME).value).toBe(EDITED_NAME);
    expect(cityBox().value).toBe(HAIFA_NAME);
    expect(buttonNamed(driver.submit).getAttribute('aria-busy')).not.toBe('true');

    await press(driver.submit);
    expect(callsOf('PATCH')).toHaveLength(2);
    expect(driver.savedScreenShown()).toBe(true);
    expect(maybeButton(driver.submit)).toBeNull();
  });

  // FIRST-09, ME-08, D-62: typing in the refused field clears the refusal
  it.each(FIELD_REFUSALS)('$name goes away when the member types', async (refusal) => {
    patchQueue.push(refusal.answer);
    await driver.prepare();
    await press(driver.submit);
    const field = input(NAME);
    type(field, `${field.value}x`);
    await settleScreen();
    expect(alerts()).toHaveLength(0);
  });
});

describe.each(DRIVERS)('$title, when an active member is banned during a save', (driver) => {
  // ME-10, R-08, D-72: the notice shows, and typing in a field does not take it away
  it('shows the permanent notice and keeps it while the member types', async () => {
    patchQueue.push(refuse(STATUS_FORBIDDEN, 'BANNED'));
    await driver.prepare();
    expect(noticeShown()).toBe(false);

    await press(driver.submit);
    expect(noticeShown()).toBe(true);

    type(input(NAME), `${input(NAME).value}x`);
    await settleScreen();
    expect(noticeShown()).toBe(true);
    await typeInCityBox('Akko');
    expect(noticeShown()).toBe(true);

    // the answer itself says the member is banned: no second GET to learn it
    expect(callsOf('GET')).toHaveLength(1);
    expect(callsOf('PATCH')).toHaveLength(1);
  });
});

describe('the profile page behind the edit form, when the member is banned during a save', () => {
  // ME-10, R-08, D-72: Cancel closes the form; the page still has the notice and no pencil
  it('keeps the notice and has no pencil once the form is cancelled', async () => {
    patchQueue.push(refuse(STATUS_FORBIDDEN, 'BANNED'));
    await open(MEMBER);
    await press('profile.edit.title');
    type(input(NAME), EDITED_NAME);
    await press('common.save');
    type(input(NAME), `${EDITED_NAME}x`);
    await settleScreen();
    expect(noticeShown()).toBe(true);

    await press('common.cancel');
    expect(maybeButton('common.save')).toBeNull();
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(noticeShown()).toBe(true);
    expect(maybeButton('profile.edit.title')).toBeNull();
    expect(maybeButton('profile.signOut')).not.toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Levi');
    expect(callsOf('GET')).toHaveLength(1);
    expect(callsOf('PATCH')).toHaveLength(1);
  });
});

describe.each(DRIVERS)('$title, when the daily save limit is reached', (driver) => {
  // FIRST-09, D-61, D-108: the text of profile.error.dailyLimit, with no wait in it, though Retry-After is sent
  it('shows the daily limit text and no wait', async () => {
    patchQueue.push(
      refuse(STATUS_TOO_MANY_REQUESTS, 'PROFILE_SAVE_DAILY_LIMIT', {
        'retry-after': String(DAILY_LIMIT_RETRY_AFTER),
      })
    );
    await driver.prepare();
    await press(driver.submit);

    const message = getLocaleText(ENGLISH_CODE, 'profile.error.dailyLimit');
    expect(message).not.toMatch(/\d|\{\{/);
    expect(alertTexts()).toEqual([message]);
    expect(document.body.textContent).not.toContain('{{');
    expect(document.body.textContent).not.toContain(String(DAILY_LIMIT_RETRY_AFTER));
  });
});

describe('a refusal with a Google photo asked', () => {
  // FIRST-09, D-27: the photo answer stays too
  it('keeps the chosen photo answer', async () => {
    patchQueue.push(refuse(STATUS_BAD_REQUEST, 'INVALID_INPUT'));
    await open(NEW_MEMBER, '/profile', GOOGLE_PHOTO);
    await fillSignUp();
    fireEvent.click(radio('firstrun.photo.yes'));
    await press('common.continue');
    expect(radio('firstrun.photo.yes').checked).toBe(true);
    expect(box().checked).toBe(true);
  });
});

// ---- FIRST-10

/** The fake ID token read answers only after `release`, and only once `engage` has been called. */
function slowTokenRead(user: ReturnType<typeof makeUser>): {
  engage: () => void;
  release: () => void;
} {
  let engaged = false;
  let release = (): void => undefined;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  fakeUserManager.getUser.mockImplementation(() =>
    engaged ? gate.then(() => user) : Promise.resolve(user)
  );
  return {
    engage: () => {
      engaged = true;
    },
    release,
  };
}

/** Watches every change of the page and remembers whether `halfDrawn` was ever true. */
function watchPage(halfDrawn: () => boolean): { stop: () => boolean } {
  let seen = false;
  const observer = new MutationObserver(() => {
    if (halfDrawn()) seen = true;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return {
    stop: () => {
      observer.disconnect();
      return seen;
    },
  };
}

const textFields = (): Element[] =>
  Array.from(document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])'));

const PHOTO_HINT = 'profile.edit.photoHint';
const hintShown = (): boolean =>
  document.body.textContent.includes(getLocaleText(ENGLISH_CODE, PHOTO_HINT));

describe('the forms wait for the ID token read', () => {
  // FIRST-10, D-108: nothing of the sign-up form is drawn until the read is done, then all of it at once
  it('draws no part of the sign-up form while the token read is slow, and the photo question with the rest', async () => {
    const user = makeUser({ picture: GOOGLE_PHOTO });
    const slow = slowTokenRead(user);
    onProfileRequest = slow.engage;
    fakeUserManager.setUser(user);
    profile = NEW_MEMBER;
    await renderAppAtPath(<App />, '/profile');
    await settleScreen();

    expect(callsOf('GET')).toHaveLength(1);
    expect(textFields()).toHaveLength(0);
    expect(radios()).toHaveLength(0);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(maybeButton('common.continue')).toBeNull();

    const watch = watchPage(() => textFields().length > 0 && radios().length === 0);
    slow.release();
    await settleScreen();
    expect(watch.stop()).toBe(false);

    expect(textFields().length).toBeGreaterThan(0);
    expect(radios()).toHaveLength(2);
    expect(maybeButton('common.continue')).not.toBeNull();
  });

  // FIRST-10, D-27, D-108: a slow read for a token with no photo: no question, ever
  it('never asks a photo question after a slow read for a token with no photo', async () => {
    const user = makeUser();
    const slow = slowTokenRead(user);
    onProfileRequest = slow.engage;
    fakeUserManager.setUser(user);
    profile = NEW_MEMBER;
    await renderAppAtPath(<App />, '/profile');
    await settleScreen();
    expect(textFields()).toHaveLength(0);

    const watch = watchPage(() => radios().length > 0);
    slow.release();
    await settleScreen();
    expect(watch.stop()).toBe(false);
    expect(textFields().length).toBeGreaterThan(0);
    expect(radios()).toHaveLength(0);
  });

  // FIRST-10, D-108: the claim is read once, above every page: until it is done nothing of the Profile page is
  // drawn (so no part of the edit form); then the page is whole and the pencil opens the form at once, note included
  it('draws nothing of the Profile page while the token read is slow, then the edit form whole', async () => {
    const user = makeUser({ picture: GOOGLE_PHOTO });
    const slow = slowTokenRead(user);
    onProfileRequest = slow.engage;
    fakeUserManager.setUser(user);
    profile = MEMBER;
    await renderAppAtPath(<App />, '/profile');
    await settleScreen();

    expect(callsOf('GET')).toHaveLength(1);
    expect(heading1()).not.toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(maybeButton('profile.edit.title')).toBeNull();
    expect(maybeButton('profile.signOut')).toBeNull();
    expect(document.querySelector('h2 bdi')).toBeNull();
    expect(textFields()).toHaveLength(0);
    expect(radios()).toHaveLength(0);
    expect(maybeButton('common.save')).toBeNull();
    expect(hintShown()).toBe(false);

    const pageHalfDrawn = (): boolean =>
      heading1() === getLocaleText(ENGLISH_CODE, 'profile.heading') &&
      (maybeButton('profile.edit.title') === null ||
        maybeButton('profile.signOut') === null ||
        document.querySelector('h2 bdi') === null);
    const watch = watchPage(pageHalfDrawn);
    slow.release();
    await settleScreen();
    expect(watch.stop()).toBe(false);

    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(maybeButton('profile.edit.title')).not.toBeNull();

    // no press-and-wait: the form is whole the moment the pencil is pressed
    fireEvent.click(buttonNamed('profile.edit.title'));
    expect(textFields().length).toBeGreaterThan(0);
    expect(radios()).toHaveLength(2);
    expect(hintShown()).toBe(true);
    expect(maybeButton('common.save')).not.toBeNull();
    expect(callsOf('GET')).toHaveLength(1);
  });

  // FIRST-10, D-27, D-108: with a Google photo the edit form has the note; with none it has no note and no question
  it.each([
    ['a Google photo', GOOGLE_PHOTO, true],
    ['no photo', undefined, false],
  ])('shows the photo note in the edit form for a token with %s', async (_name, picture, shown) => {
    expect(getLocaleText(ENGLISH_CODE, PHOTO_HINT)).not.toContain('{{');
    await open(MEMBER, '/profile', picture);
    await press('profile.edit.title');
    expect(input(NAME).value).toBe('Dana Levi');
    expect(hintShown()).toBe(shown);
    expect(radios()).toHaveLength(shown ? 2 : 0);
  });
});

// ---- ME-07, ME-05, ME-09

/** Whether an element that a screen reader skips shows exactly this text. */
function hiddenTextShown(value: string): boolean {
  const hidden = Array.from(document.querySelectorAll('[aria-hidden="true"]'));
  return hidden.some((node) => node.textContent.trim() === value);
}

/** The first letter of each of the first AVATAR_INITIALS_COUNT words, upper-cased (D-21). */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).slice(0, AVATAR_INITIALS_COUNT);
  return words.map((word) => Array.from(word)[0].toUpperCase()).join('');
}

const avatarImage = (): HTMLImageElement | null => document.querySelector('img');

describe('the profile page', () => {
  // ME-07, D-21, D-27: a chosen Google photo, the name and the city, and a way out
  it('shows the chosen photo, the name, the city and Sign out', async () => {
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    const image = avatarImage();
    expect(image?.getAttribute('src')).toBe(GOOGLE_PHOTO);
    // decorative: the name beside it says who it is
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Levi');
    expect(document.querySelector('p bdi')?.textContent).toBe('Haifa');
    expect(maybeButton('profile.signOut')).not.toBeNull();
  });

  // ME-07, D-21, D-27: no chosen photo: the initials
  it('shows the initials when there is no photo', async () => {
    await open({ ...MEMBER, avatar_url: null, show_google_photo: false });
    expect(avatarImage()).toBeNull();
    expect(hiddenTextShown('DL')).toBe(true);
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Levi');
    expect(maybeButton('profile.signOut')).not.toBeNull();
  });

  // ME-07, ME-05, D-21: a photo address that does not load falls back to the initials
  it('falls back to the initials when the photo address is broken', async () => {
    await open({ ...MEMBER, avatar_url: BROKEN_PHOTO });
    const image = avatarImage();
    expect(image?.getAttribute('src')).toBe(BROKEN_PHOTO);
    expect(hiddenTextShown('DL')).toBe(false);
    if (image === null) throw new Error('no image');
    fireEvent.error(image);
    await settleScreen();
    expect(avatarImage()).toBeNull();
    expect(hiddenTextShown('DL')).toBe(true);
    expect(maybeButton('profile.signOut')).not.toBeNull();
  });

  // ME-07, ME-05, D-21: names in other scripts and with emoji are shown whole, the initials are characters
  const NAMES: [string, string][] = [
    ['דנה כהן', 'דכ'],
    ['سارة أحمد', 'سأ'],
    ['иван петров', 'ИП'],
    ['🐱 Dana', '🐱D'],
    ['🐱🐱 x', '🐱X'],
    ['dana', 'D'],
    ['dana  levi', 'DL'],
    ['élan vital', 'ÉV'],
    ['dana levi cohen', initialsOf('dana levi cohen')],
  ];

  it.each(NAMES)('shows the name %s and the initials %s', async (name, initials) => {
    await open({ ...MEMBER, display_name: name, avatar_url: null, show_google_photo: false });
    expect(document.querySelector('h2 bdi')?.textContent).toBe(name);
    expect(hiddenTextShown(initials)).toBe(true);
  });

  // ME-05, D-21: initials are whole visible characters: a family emoji, a letter with its marks
  const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}';
  const BET_WITH_MARKS = 'בְּ';
  const E_ACCENT = 'é';
  const WHOLE_CHARACTERS: [string, string, string][] = [
    ['a family emoji first', `${FAMILY} Dana`, `${FAMILY}D`],
    ['a family emoji alone', FAMILY, FAMILY],
    ['a family emoji second', `Dana ${FAMILY}`, `D${FAMILY}`],
    ['a Hebrew letter with vowel marks', `${BET_WITH_MARKS}רוך לוי`, `${BET_WITH_MARKS}ל`],
    ['a Latin letter and a combining accent', `${E_ACCENT}lan vital`, 'ÉV'],
    ['a combining accent in the second word', `dana ${E_ACCENT}li`, 'DÉ'],
  ];

  const hiddenTexts = (): string[] =>
    Array.from(document.querySelectorAll('[aria-hidden="true"]')).map((node) =>
      node.textContent.trim().normalize('NFC')
    );

  it.each(WHOLE_CHARACTERS)('cuts %s whole', async (_what, name, initials) => {
    await open({ ...MEMBER, display_name: name, avatar_url: null, show_google_photo: false });
    expect(hiddenTexts()).toContain(initials.normalize('NFC'));
    // never half an emoji joined to nothing, never a bare mark
    for (const shown of hiddenTexts()) expect(shown).not.toMatch(/^[\p{M}‍]|‍$/u);
  });

  // ME-05, D-21: the initials come from the first words only
  it('takes initials from the first words only', async () => {
    await open({ ...MEMBER, display_name: 'ana bea cy dee', avatar_url: null });
    expect(hiddenTextShown(initialsOf('ana bea cy dee'))).toBe(true);
    expect(hiddenTextShown('ABCD')).toBe(false);
  });

  // ME-07, ME-05: a name with a direction mark inside is shown whole
  it('shows a Hebrew name with a mark inside without cutting it', async () => {
    await open({ ...MEMBER, display_name: PROFILE.display_name, avatar_url: null });
    expect(document.querySelector('h2 bdi')?.textContent).toBe(PROFILE.display_name);
  });

  // A11Y-05, D-58: the pencil is an icon: it has a translated name in every language
  it.each(LANGUAGE_CODES)('names the pencil in %s', async (code) => {
    profile = MEMBER;
    signIn();
    await renderAppAtPath(<App />, '/profile', code);
    await settleScreen();
    expect(
      screen.getByRole('button', { name: getLocaleText(code, 'profile.edit.title') })
    ).toBeDefined();
    expect(heading1()).toBe(getLocaleText(code, 'profile.heading'));
  });

  // ME-09, R-08, D-72: a banned member sees the permanent notice, has no pencil, and can sign out
  it('shows a banned member the notice and no pencil, and Sign out works', async () => {
    await open({ ...MEMBER, status: 'banned' });
    expect(heading1()).toBe(getLocaleText(ENGLISH_CODE, 'profile.heading'));
    expect(noticeShown()).toBe(true);
    expect(maybeButton('profile.edit.title')).toBeNull();

    await press('profile.signOut');
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(new URL(replace.mock.calls[0][0]).pathname).toBe('/logout');
  });

  // ME-09, D-72: an active member sees no notice
  it('shows an active member no notice', async () => {
    await open(MEMBER);
    expect(noticeShown()).toBe(false);
  });
});

// ---- ME-08

describe('editing the profile', () => {
  const photoAnswer = (kind: 'yes' | 'no'): HTMLInputElement =>
    radio(kind === 'yes' ? 'firstrun.photo.yes' : 'firstrun.photo.no');

  // ME-08, D-108, A11Y-05: the pencil opens a form with the values in it and no terms box
  it('opens the form with the current values, the photo answer and no terms box', async () => {
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    const title = getLocaleText(ENGLISH_CODE, 'profile.edit.title');
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeDefined();
    expect(input(NAME).value).toBe('Dana Levi');
    // ME-19, D-117: the box starts with the picked place, in the app's language
    expect(cityBox().value).toBe(HAIFA_NAME);
    expect(photoAnswer('yes').checked).toBe(true);
    expect(photoAnswer('no').checked).toBe(false);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(maybeButton('common.save')).not.toBeNull();
    expect(maybeButton('common.cancel')).not.toBeNull();
    // the pencil gives way while the form is open
    expect(maybeButton('profile.edit.title')).toBeNull();
  });

  // ME-08, D-27: a member who said no sees no selected
  it('shows the answer no as chosen for a member who said no', async () => {
    await open(SAID_NO, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    expect(photoAnswer('no').checked).toBe(true);
    expect(photoAnswer('yes').checked).toBe(false);
  });

  // ME-08, D-27, D-108: no Google photo in the token: no question in the edit form either
  it('asks no photo question when the token has no photo', async () => {
    await open(MEMBER);
    await press('profile.edit.title');
    expect(radios()).toHaveLength(0);
  });

  // ME-08, D-27, D-62, D-108: a changed Save sends name, city and photo answer, never accept_terms, then shows the new name
  it('sends one PATCH without accept_terms and shows the new values', async () => {
    patchQueue.push(accept({ ...MEMBER, display_name: 'Dana Cohen' }));
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    type(input(NAME), '  Dana Cohen ');
    await press('common.save');

    const patches = callsOf('PATCH');
    expect(patches).toHaveLength(1);
    const [url, init] = patches[0];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(bodyOf(patches[0])).toEqual({
      display_name: 'Dana Cohen',
      city_id: HAIFA_ID,
      show_google_photo: true,
    });
    expect(Object.hasOwn(bodyOf(patches[0]), 'accept_terms')).toBe(false);

    // the form is closed and the page shows the new values
    expect(maybeButton('common.save')).toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Cohen');
    expect(maybeButton('profile.edit.title')).not.toBeNull();
    expect(callsOf('GET')).toHaveLength(1);
  });

  // ME-08, D-27: changing only the photo answer is a change
  it('sends the photo answer when only it changed', async () => {
    patchQueue.push(accept({ ...MEMBER, show_google_photo: false, avatar_url: null }));
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    fireEvent.click(photoAnswer('no'));
    await press('common.save');
    expect(bodyOf(callsOf('PATCH')[0])).toEqual({
      display_name: 'Dana Levi',
      city_id: HAIFA_ID,
      show_google_photo: false,
    });
    expect(avatarImage()).toBeNull();
  });

  // ME-08, D-27, D-108: with no photo question, the PATCH has no show_google_photo
  it('sends no show_google_photo when the token has no photo', async () => {
    patchQueue.push(accept({ ...MEMBER, city_id: JERUSALEM_ID }));
    await open(MEMBER);
    await press('profile.edit.title');
    await pickCity('Jerusalem', 'Jerusalem');
    expect(cityBox().value).toBe('Jerusalem');
    await press('common.save');
    expect(bodyOf(callsOf('PATCH')[0])).toEqual({
      display_name: 'Dana Levi',
      city_id: JERUSALEM_ID,
    });
    expect(document.querySelector('p bdi')?.textContent).toBe('Jerusalem');
  });

  // ME-08, D-108: Cancel sends nothing, closes the form and drops what was typed
  it('closes on Cancel with no request and forgets the change', async () => {
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    type(input(NAME), 'Someone Else');
    await press('common.cancel');
    expect(callsOf('PATCH')).toHaveLength(0);
    expect(maybeButton('common.save')).toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Levi');

    await press('profile.edit.title');
    expect(input(NAME).value).toBe('Dana Levi');
  });

  // ME-08, D-108: Save with nothing changed sends nothing and closes
  it('closes on an unchanged Save with no request', async () => {
    await open(MEMBER, '/profile', GOOGLE_PHOTO);
    await press('profile.edit.title');
    await press('common.save');
    expect(callsOf('PATCH')).toHaveLength(0);
    expect(maybeButton('common.save')).toBeNull();
    expect(document.querySelector('h2 bdi')?.textContent).toBe('Dana Levi');
    expect(maybeButton('profile.edit.title')).not.toBeNull();
  });

  // ME-08, D-61, D-62: the same checks as the sign-up form, under their fields, and nothing is sent
  it.each([
    ['an empty name', '', 'firstrun.name.required'],
    ['a short name', 'a'.repeat(PROFILE_NAME_MIN_LENGTH - 1), 'firstrun.name.invalid'],
  ])('says what is wrong with %s', async (_name, value, key) => {
    await open(MEMBER);
    await press('profile.edit.title');
    expect(alerts()).toHaveLength(0);
    type(input(NAME), value);
    await press('common.save');
    expect(messagesOf(input(NAME))).toEqual([words(key)]);
    expect(input(NAME).getAttribute('aria-invalid')).toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // ME-08, FIRST-15, D-117: a cleared city, or text typed and not chosen, is refused under the box and nothing is sent
  it.each([
    ['a cleared city', ''],
    ['text typed and not chosen', 'Hai'],
  ])('refuses %s with "Choose a city from the list"', async (_name, typed) => {
    await open(MEMBER);
    await press('profile.edit.title');
    type(cityBox(), typed);
    await settleScreen();
    await press('common.save');
    expect(messagesOf(cityBox())).toEqual([words('firstrun.city.required')]);
    expect(cityBox().getAttribute('aria-invalid')).toBe('true');
    expect(callsOf('PATCH')).toHaveLength(0);
  });

  // ME-08, D-57: a double press sends one request
  it('sends one request for a double press of Save', async () => {
    const pending = held();
    patchQueue.push(pending.answer);
    await open(MEMBER);
    await press('profile.edit.title');
    type(input(NAME), EDITED_NAME);
    fireEvent.click(buttonNamed('common.save'));
    fireEvent.click(buttonNamed('common.save'));
    await settleScreen();
    expect(buttonNamed('common.save').getAttribute('aria-busy')).toBe('true');
    expect(callsOf('PATCH')).toHaveLength(1);
    pending.release(jsonResponse(STATUS_OK, { ...MEMBER, display_name: EDITED_NAME }));
    await settleScreen();
    expect(callsOf('PATCH')).toHaveLength(1);
    expect(document.querySelector('h2 bdi')?.textContent).toBe(EDITED_NAME);
  });
});

// ---- FIRST-14

/** A text with its placeholders filled, in any language. */
function wordsIn(code: string, key: string): string {
  const filled: Record<string, string> = {
    min: String(PROFILE_NAME_MIN_LENGTH),
    max: String(PROFILE_NAME_MAX_LENGTH),
  };
  return getLocaleText(code, key).replace(
    /\{\{(\w+)\}\}/g,
    (whole, name: string) => filled[name] ?? whole
  );
}

const fieldIn = (code: string, key: string): HTMLInputElement => {
  const found = screen.getByRole('textbox', { name: getLocaleText(code, key) });
  if (!(found instanceof HTMLInputElement)) throw new Error(`${key} is not an input`);
  return found;
};

async function pressIn(code: string, key: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: getLocaleText(code, key) }));
  await settleScreen();
}

/** Haifa as each language's list entry shows it (D-117). */
const HAIFA_NAMES: Record<string, string> = { he: 'חיפה', en: 'Haifa', ar: 'حيفا', ru: 'Хайфа' };

/** The name typed into the sign-up form or the edit form, in the language `code`, and the form sent. */
async function sendNameIn(form: 'sign-up' | 'edit', code: string, name: string): Promise<void> {
  profile = form === 'sign-up' ? NEW_MEMBER : { ...MEMBER, display_name: 'Old Name' };
  signIn();
  await renderAppAtPath(<App />, '/profile', code);
  await settleScreen();
  if (form === 'sign-up') {
    await pickCity('Haifa', HAIFA_NAMES[code], code);
    fireEvent.click(box());
    type(fieldIn(code, NAME), name);
    await pressIn(code, 'common.continue');
  } else {
    await pressIn(code, 'profile.edit.title');
    type(fieldIn(code, NAME), name);
    await pressIn(code, 'common.save');
  }
}

const LENGTH_REFUSED = [
  ['too short', letters(PROFILE_NAME_MIN_LENGTH - 1)],
  ['too long', letters(PROFILE_NAME_MAX_LENGTH + 1)],
];
const NOT_A_NAME = [
  ['a digit', 'Dana2'],
  ['an emoji', 'Dana 😀'],
  ['a letter three times in a row', 'Dana Lllevi'],
  ['a blocked word', 'Test'],
];
const NAME_ACCEPTED = [
  ['the minimum length', letters(PROFILE_NAME_MIN_LENGTH), letters(PROFILE_NAME_MIN_LENGTH)],
  ['two spaces in a row, sent with one', 'Dana  Levi', 'Dana Levi'],
  ['Hebrew', 'דנה לוי', 'דנה לוי'],
];

describe.each(['sign-up', 'edit'] as const)(
  'the %s form and the full name (FIRST-14, D-116)',
  (form) => {
    describe.each(LANGUAGE_CODES)('in %s', (code) => {
      // FIRST-14, D-116: the length message alone, nothing sent
      it.each(LENGTH_REFUSED)('says the length alone for a name %s', async (_name, value) => {
        await sendNameIn(form, code, value);
        expect(messagesOf(fieldIn(code, NAME))).toEqual([wordsIn(code, 'firstrun.name.invalid')]);
        expect(callsOf('PATCH')).toHaveLength(0);
      });

      // FIRST-14, PROF-32, D-116: one message, "that does not look like a name", under the field
      it.each(NOT_A_NAME)('says it does not look like a name for %s', async (_name, value) => {
        await sendNameIn(form, code, value);
        expect(messagesOf(fieldIn(code, NAME))).toEqual([wordsIn(code, 'firstrun.name.notName')]);
        expect(fieldIn(code, NAME).getAttribute('aria-invalid')).toBe('true');
        expect(callsOf('PATCH')).toHaveLength(0);
      });

      // FIRST-14, PROF-32, D-116: the request carries the name with one space
      it.each(NAME_ACCEPTED)('sends a name with %s', async (_name, value, sent) => {
        patchQueue.push(accept(MEMBER));
        await sendNameIn(form, code, value);
        expect(alerts()).toHaveLength(0);
        const patches = callsOf('PATCH');
        expect(patches).toHaveLength(1);
        expect(bodyOf(patches[0]).display_name).toBe(sent);
      });
    });
  }
);
