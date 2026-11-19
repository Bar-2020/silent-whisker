// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { App as AppComponent } from '@app/App';
import { installDialogMethods, pressEscapeIn } from '@shared/test-support/dialog-methods';
import { ENGLISH_CODE, getLocaleText, LANGUAGE_CODES } from '@shared/test-support/locale-texts';
import { answerCityFile, isCityFileUrl } from '@shared/test-support/city-files-fake';
import { HAIFA_ID } from '@shared/test-support/pick-city';
import { renderAppAtPath } from '@shared/test-support/render-app-in-memory-router';
import { settleAsyncUpdates } from '@shared/test-support/settle-async-updates';
import type { fakeUserManager as FakeUserManager } from '@shared/test-support/sign-in-fakes';
import {
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
import type { ProfileResponse } from '@schemas/profile.schema';
import auth from '@constants/auth.json';
import { FIRST_RUN_STORAGE_PREFIX, INSTALL_STEP_DONE_STORAGE_KEY } from '@constants/first-run';
import {
  API_PATH_PREFIX,
  DEFAULT_RETRY_AFTER_SECONDS,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_OK,
  STATUS_SERVER_ERROR,
  STATUS_TOO_MANY_REQUESTS,
  STATUS_UNAVAILABLE,
} from '@constants/http';
import { OIDC_STORAGE_PREFIX, SIGN_IN_STARTED_STORAGE_KEY } from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const ORIGIN = 'https://app.example.test';
const SETTLE_ROUNDS = 6;
const RETRY_AFTER = DEFAULT_RETRY_AFTER_SECONDS + 1;

const settleScreen = (): Promise<void> => settleAsyncUpdates(SETTLE_ROUNDS);

const ACTIVE: ProfileResponse = {
  ...PROFILE,
  display_name: 'Dana Levi',
  city_id: HAIFA_ID,
  terms_accepted: true,
};
const BANNED: ProfileResponse = { ...ACTIVE, status: 'banned' };

const MEMBERS: [string, ProfileResponse][] = [
  ['an active member', ACTIVE],
  ['a banned member', BANNED],
];

let fakeUserManager: typeof FakeUserManager;
let App: typeof AppComponent;
let profile: ProfileResponse;

type Answer = () => Promise<Response>;
/** The answers `DELETE /profile` gives in turn; when none is left it answers as the API does (D-109). */
let deleteQueue: Answer[] = [];

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const replace = vi.fn<(url: string) => void>();

function isFake(value: unknown): value is typeof FakeUserManager {
  return typeof value === 'object' && value !== null && 'setUser' in value && 'reset' in value;
}

const methodOf = (init?: RequestInit): string => (init?.method ?? 'GET').toUpperCase();

type Call = [url: string, init?: RequestInit];

const callsOf = (method: string): Call[] =>
  fetchMock.mock.calls.filter(([url, init]) => methodOf(init) === method && !isCityFileUrl(url));
const deleteCalls = (): Call[] => callsOf('DELETE');

const bodySchema = z.record(z.string(), z.unknown());

function bodyOf(call: Call): Record<string, unknown> {
  const body = call[1]?.body;
  if (typeof body !== 'string') throw new Error('the body is not JSON text');
  return bodySchema.parse(JSON.parse(body));
}

/** The `confirm` of every `DELETE /profile` sent so far, in order. */
const confirmsSent = (): unknown[] => deleteCalls().map((call) => bodyOf(call).confirm);

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
  installDialogMethods();
  profile = ACTIVE;
  deleteQueue = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation((url, init) => {
    const cityFile = answerCityFile(url);
    if (cityFile !== undefined) return Promise.resolve(cityFile);
    if (methodOf(init) !== 'DELETE') return Promise.resolve(jsonResponse(STATUS_OK, profile));
    const next = deleteQueue.shift();
    if (next !== undefined) return next();
    const confirm = bodyOf([url, init]).confirm === true;
    return Promise.resolve(jsonResponse(STATUS_OK, { deleted: confirm }));
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

function answer(status: number, body?: unknown, headers: Record<string, string> = {}): Answer {
  return () => Promise.resolve(jsonResponse(status, body, headers));
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

// ---- the screen

const text = (key: string, code = ENGLISH_CODE): string => getLocaleText(code, key);
const withValue = (key: string, value: string): string => text(key).replace(/\{\{\w+\}\}/g, value);

const ROW = 'profile.delete.row';
const RED_BUTTON = 'profile.delete.confirm';
const TITLE = 'profile.delete.confirm.title';
const BODY_TEXT = 'profile.delete.confirm.text';

const rowButton = (code = ENGLISH_CODE): HTMLElement =>
  screen.getByRole('button', { name: text(ROW, code) });
const maybeDialog = (): HTMLElement | null => screen.queryByRole('dialog', { name: text(TITLE) });

function dialog(): HTMLDialogElement {
  const found = screen.getByRole('dialog', { name: text(TITLE) });
  if (!(found instanceof HTMLDialogElement)) throw new Error('the dialog is not a <dialog>');
  return found;
}

const redButton = (): HTMLElement =>
  within(dialog()).getByRole('button', { name: text(RED_BUTTON) });
const cancelButton = (): HTMLElement =>
  within(dialog()).getByRole('button', { name: text('common.cancel') });
const isBusy = (): boolean => redButton().getAttribute('aria-busy') === 'true';

const alertsInDialog = (): string[] =>
  within(dialog())
    .queryAllByRole('alert')
    .map((node) => node.textContent.trim());

const noDialogOnPage = (): boolean => document.querySelector('dialog') === null;

const noticeShown = (): boolean =>
  document.body.textContent.includes(text('common.banned.title')) &&
  document.body.textContent.includes(text('common.banned.text'));

async function openProfile(member: ProfileResponse, code = ENGLISH_CODE): Promise<void> {
  profile = member;
  fakeUserManager.setUser(makeUser());
  await renderAppAtPath(<App />, '/profile', code);
  await settleScreen();
}

async function openDialog(member: ProfileResponse = ACTIVE): Promise<void> {
  await openProfile(member);
  fireEvent.click(rowButton());
  await settleScreen();
}

async function pressRed(): Promise<void> {
  fireEvent.click(redButton());
  await settleScreen();
}

/** The visit went to Cognito's /logout with the app's own address (SHELL-14). */
function expectSignedOutToCognito(): void {
  expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledTimes(1);
  const url = new URL(replace.mock.calls[0][0]);
  expect(`${url.origin}${url.pathname}`).toBe(`${FAKE_COGNITO_DOMAIN}/logout`);
  expect(url.searchParams.get('client_id')).toBe(auth.client_id);
  expect(url.searchParams.get('logout_uri')).toBe(`${ORIGIN}/`);
}

function expectStillSignedIn(): void {
  expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
}

// ---- ME-11

describe.each(MEMBERS)('the Delete my account row, for %s', (_who, member) => {
  // ME-11, D-71: the row sits in the Settings section with Sign out; nothing is sent before it is pressed
  it('sits in the Settings section beside Sign out, and sends nothing before it is pressed', async () => {
    await openProfile(member);
    const settings = screen.getByRole('region', { name: text('profile.settings.title') });
    expect(within(settings).getByRole('button', { name: text(ROW) })).toBeDefined();
    expect(within(settings).getByRole('button', { name: text('profile.signOut') })).toBeDefined();
    expect(noDialogOnPage()).toBe(true);
    expect(deleteCalls()).toHaveLength(0);
  });

  // ME-11, D-71, D-109: a dialog with a red button and a quiet Cancel, and one check call with the ID token
  it('opens a dialog with the red button and Cancel, and sends one check with the ID token', async () => {
    await openDialog(member);
    expect(dialog().hasAttribute('open')).toBe(true);
    expect(within(dialog()).getByText(text(BODY_TEXT))).toBeDefined();
    expect(redButton()).toBeDefined();
    expect(cancelButton()).toBeDefined();

    const sent = deleteCalls();
    expect(sent).toHaveLength(1);
    const [url, init] = sent[0];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    expect(methodOf(init)).toBe('DELETE');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(headers.get('content-type')).toBe('application/json');
    expect(bodyOf(sent[0])).toEqual({ confirm: false });

    // the check deletes nothing: the member is still signed in and the dialog has no message
    expectStillSignedIn();
    expect(alertsInDialog()).toEqual([]);
    expect(isBusy()).toBe(false);
  });

  // ME-11, D-109: the red button shows a spinner (aria-busy) until the check answers, and a press then sends nothing
  it('shows the red button busy until the check answers, and a press meanwhile sends nothing', async () => {
    const check = held();
    deleteQueue.push(check.answer);
    await openDialog(member);
    expect(isBusy()).toBe(true);

    fireEvent.click(redButton());
    await settleScreen();
    expect(deleteCalls()).toHaveLength(1);
    expect(confirmsSent()).toEqual([false]);
    expectStillSignedIn();

    check.release(jsonResponse(STATUS_OK, { deleted: false }));
    await settleScreen();
    expect(isBusy()).toBe(false);
    expect(deleteCalls()).toHaveLength(1);
    expect(maybeDialog()).not.toBeNull();
  });

  // ME-11, D-71: Cancel closes the dialog and sends nothing more
  it('closes on Cancel and sends nothing more', async () => {
    await openDialog(member);
    fireEvent.click(cancelButton());
    await settleScreen();
    expect(noDialogOnPage()).toBe(true);
    expect(confirmsSent()).toEqual([false]);
    expectStillSignedIn();
  });

  // ME-11, D-71: Escape closes the dialog and sends nothing more
  it('closes on Escape and sends nothing more', async () => {
    await openDialog(member);
    pressEscapeIn(dialog());
    await settleScreen();
    expect(noDialogOnPage()).toBe(true);
    expect(confirmsSent()).toEqual([false]);
    expectStillSignedIn();
  });

  // ME-11, D-71: a tap on the scrim (the dialog element itself) closes the dialog and sends nothing more
  it('closes on a tap on the scrim and sends nothing more', async () => {
    await openDialog(member);
    fireEvent.click(dialog());
    await settleScreen();
    expect(noDialogOnPage()).toBe(true);
    expect(confirmsSent()).toEqual([false]);
    expectStillSignedIn();
  });

  // ME-11: a tap on the words or the pane inside the dialog is not a tap on the scrim
  it('stays open when the text inside it is tapped', async () => {
    await openDialog(member);
    fireEvent.click(within(dialog()).getByText(text(BODY_TEXT)));
    await settleScreen();
    expect(maybeDialog()).not.toBeNull();
    expect(confirmsSent()).toEqual([false]);
  });

  // ME-11, D-71, D-109: the red button sends confirm true, then the tokens are gone and the visit goes to /logout
  it('sends confirm true on the red button, then signs out to Cognito', async () => {
    await openDialog(member);
    seedSignInStorage();
    await pressRed();

    const sent = deleteCalls();
    expect(sent).toHaveLength(2);
    expect(confirmsSent()).toEqual([false, true]);
    const [url, init] = sent[1];
    expect(url).toBe(`${API_PATH_PREFIX}/profile`);
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(headers.get('content-type')).toBe('application/json');

    expectSignedOutToCognito();
    const left = Object.keys(localStorage).filter((key) => key.startsWith(OIDC_STORAGE_PREFIX));
    expect(left).toEqual([]);
    expect(OIDC_STORAGE_KEYS.filter((key) => localStorage.getItem(key) !== null)).toEqual([]);
    expect(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(UNRELATED_STORAGE_KEY)).toBe(UNRELATED_STORAGE_VALUE);
    // a member who deleted the account is not sent to Google
    expect(fakeUserManager.signinRedirect).not.toHaveBeenCalled();
  });

  // ME-11, D-109: the red button is busy while the delete is on its way, and signing out waits for the answer
  it('shows the red button busy while the delete waits, and does not sign out before it answers', async () => {
    const pending = held();
    await openDialog(member);
    deleteQueue.push(pending.answer);
    fireEvent.click(redButton());
    await settleScreen();
    expect(isBusy()).toBe(true);
    expect(confirmsSent()).toEqual([false, true]);
    expectStillSignedIn();

    pending.release(jsonResponse(STATUS_OK, { deleted: true }));
    await settleScreen();
    expectSignedOutToCognito();
    expect(confirmsSent()).toEqual([false, true]);
  });
});

describe('the delete dialog, the same for every member', () => {
  // ME-11, D-71, D-72: an active and a banned member read the same words and make the same calls
  it.each(MEMBERS)('has the one text and the two calls for %s', async (_who, member) => {
    await openDialog(member);
    const words = dialog().textContent;
    for (const key of [TITLE, BODY_TEXT, RED_BUTTON, 'common.cancel']) {
      expect(words).toContain(text(key));
    }
    await pressRed();
    expect(confirmsSent()).toEqual([false, true]);
  });

  // ME-11, R-08, D-72: the permanent notice of a banned member stays on the page behind the dialog and after Cancel
  it('leaves the banned notice on the page', async () => {
    await openDialog(BANNED);
    expect(noticeShown()).toBe(true);
    fireEvent.click(cancelButton());
    await settleScreen();
    expect(noticeShown()).toBe(true);
    expect(rowButton()).toBeDefined();
  });

  // ME-11, D-71, D-109: opened again after Cancel it checks again and deletes nothing
  it('can be opened again after Cancel', async () => {
    await openDialog();
    fireEvent.click(cancelButton());
    await settleScreen();
    fireEvent.click(rowButton());
    await settleScreen();
    expect(maybeDialog()).not.toBeNull();
    expect(confirmsSent().at(-1)).toBe(false);
    expect(confirmsSent()).not.toContain(true);
  });

  // ME-11, A11Y-05, D-71: the row, the title and the words are in every language
  it.each(LANGUAGE_CODES)('is in %s', async (code) => {
    await openProfile(ACTIVE, code);
    fireEvent.click(rowButton(code));
    await settleScreen();
    const found = screen.getByRole('dialog', { name: text(TITLE, code) });
    expect(within(found).getByText(text(BODY_TEXT, code))).toBeDefined();
    expect(within(found).getByRole('button', { name: text(RED_BUTTON, code) })).toBeDefined();
    expect(within(found).getByRole('button', { name: text('common.cancel', code) })).toBeDefined();
    expect(
      screen.getByRole('region', { name: text('profile.settings.title', code) })
    ).toBeDefined();
  });
});

// ---- ME-03, ME-09 (the component half of the end-to-end rows)

describe('Delete my account and Sign out together', () => {
  // ME-03, D-71: Cancel keeps the account; confirm signs out to Cognito with the app's own address as the way back
  it('keeps the account on Cancel, and signs out to the app address on confirm', async () => {
    await openDialog();
    fireEvent.click(cancelButton());
    await settleScreen();
    expectStillSignedIn();
    expect(confirmsSent()).toEqual([false]);

    fireEvent.click(rowButton());
    await settleScreen();
    await pressRed();
    expect(confirmsSent()).toEqual([false, false, true]);
    expectSignedOutToCognito();
  });

  // ME-09, R-08, D-72: a banned member's Sign out still works, with the new row beside it
  it('lets a banned member sign out without any delete call', async () => {
    await openProfile(BANNED);
    fireEvent.click(screen.getByRole('button', { name: text('profile.signOut') }));
    await settleScreen();
    expectSignedOutToCognito();
    expect(deleteCalls()).toHaveLength(0);
  });

  // SHELL-14, D-59: Sign out of an active member does not open the dialog or call DELETE
  it('signs an active member out with no dialog and no delete call', async () => {
    await openProfile(ACTIVE);
    fireEvent.click(screen.getByRole('button', { name: text('profile.signOut') }));
    await settleScreen();
    expectSignedOutToCognito();
    expect(deleteCalls()).toHaveLength(0);
    expect(noDialogOnPage()).toBe(true);
  });
});

// ---- ME-12

interface Refusal {
  name: string;
  answer: Answer;
  message: string;
}

/** The plain messages of the dialog; a refusal shows its own and no other. */
const MESSAGES = {
  rateLimit: (seconds: number): string => withValue('common.rateLimit.text', String(seconds)),
  unavailable: text('profile.error.unavailable'),
  notDeleted: text('profile.delete.error'),
};

const REFUSALS: Refusal[] = [
  {
    name: '429 with Retry-After',
    answer: answer(
      STATUS_TOO_MANY_REQUESTS,
      { code: 'RATE_LIMITED' },
      { 'retry-after': String(RETRY_AFTER) }
    ),
    message: MESSAGES.rateLimit(RETRY_AFTER),
  },
  {
    name: 'a bare 429',
    answer: answer(STATUS_TOO_MANY_REQUESTS),
    message: MESSAGES.rateLimit(DEFAULT_RETRY_AFTER_SECONDS),
  },
  {
    name: 'a bare 503',
    answer: answer(STATUS_UNAVAILABLE),
    message: MESSAGES.unavailable,
  },
  {
    name: 'a 5xx with a code',
    answer: answer(STATUS_SERVER_ERROR, { code: 'INTERNAL' }),
    message: MESSAGES.unavailable,
  },
  {
    name: 'no connection',
    answer: offline,
    message: MESSAGES.unavailable,
  },
  {
    name: 'a 400 with a code',
    answer: answer(STATUS_BAD_REQUEST, { code: 'INVALID_INPUT' }),
    message: MESSAGES.notDeleted,
  },
  {
    name: 'a 404 with a code',
    answer: answer(STATUS_NOT_FOUND, { code: 'NOT_FOUND' }),
    message: MESSAGES.notDeleted,
  },
];

const ALL_MESSAGES = [
  MESSAGES.unavailable,
  MESSAGES.notDeleted,
  MESSAGES.rateLimit(RETRY_AFTER),
  MESSAGES.rateLimit(DEFAULT_RETRY_AFTER_SECONDS),
];

/** The refusal is in the dialog, in words, with no placeholder left, and no other plain message is shown. */
function expectOnlyMessage(message: string): void {
  expect(alertsInDialog()).toEqual([message]);
  expect(dialog().textContent).not.toContain('{{');
  for (const other of ALL_MESSAGES.filter((one) => one !== message)) {
    expect(document.body.textContent).not.toContain(other);
  }
}

describe.each(MEMBERS)('the delete dialog, when the server refuses, for %s', (_who, member) => {
  // ME-12, R-21, D-109: the check is refused: a plain message in the dialog, which stays open
  it.each(REFUSALS)('says why when the check answers $name', async (refusal) => {
    deleteQueue.push(refusal.answer);
    await openDialog(member);
    expect(maybeDialog()).not.toBeNull();
    expectOnlyMessage(refusal.message);
    expect(isBusy()).toBe(false);
    expect(confirmsSent()).toEqual([false]);
    expectStillSignedIn();
  });

  // ME-12, R-21, D-109: after a refused check the red button works again and its press sends confirm true
  it.each(REFUSALS)('lets the member go on after the check answers $name', async (refusal) => {
    deleteQueue.push(refusal.answer);
    await openDialog(member);
    await pressRed();
    expect(confirmsSent()).toEqual([false, true]);
    expectSignedOutToCognito();
  });

  // ME-12, R-21, D-109: the delete is refused: the same plain message, nothing signed out, the dialog open
  it.each(REFUSALS)('says why when the delete answers $name', async (refusal) => {
    await openDialog(member);
    deleteQueue.push(refusal.answer);
    seedSignInStorage();
    await pressRed();
    expect(confirmsSent()).toEqual([false, true]);
    expect(maybeDialog()).not.toBeNull();
    expectOnlyMessage(refusal.message);
    expect(isBusy()).toBe(false);
    expectStillSignedIn();
    // the tokens stay: nothing was deleted
    expect(OIDC_STORAGE_KEYS.filter((key) => localStorage.getItem(key) === null)).toEqual([]);
  });

  // ME-12, R-21, D-109: after a refused delete a second press sends a new request and it can succeed
  it.each(REFUSALS)('lets the member try again after the delete answers $name', async (refusal) => {
    await openDialog(member);
    deleteQueue.push(refusal.answer);
    await pressRed();
    expectOnlyMessage(refusal.message);

    await pressRed();
    expect(confirmsSent()).toEqual([false, true, true]);
    expectSignedOutToCognito();
  });

  // ME-12, D-109: a refusal can be followed by another, and Cancel still closes the dialog
  it('closes on Cancel after a refusal, and sends nothing more', async () => {
    await openDialog(member);
    deleteQueue.push(answer(STATUS_BAD_REQUEST, { code: 'INVALID_INPUT' }));
    await pressRed();
    expectOnlyMessage(MESSAGES.notDeleted);
    fireEvent.click(cancelButton());
    await settleScreen();
    expect(noDialogOnPage()).toBe(true);
    expect(confirmsSent()).toEqual([false, true]);
    expectStillSignedIn();
  });

  // ME-12, R-21, D-109: two presses at once send one request
  it('sends one request for two presses of the red button at once', async () => {
    const pending = held();
    await openDialog(member);
    deleteQueue.push(pending.answer);
    fireEvent.click(redButton());
    fireEvent.click(redButton());
    await settleScreen();
    expect(isBusy()).toBe(true);
    fireEvent.click(redButton());
    await settleScreen();
    expect(confirmsSent()).toEqual([false, true]);

    pending.release(jsonResponse(STATUS_OK, { deleted: true }));
    await settleScreen();
    expect(confirmsSent()).toEqual([false, true]);
    expectSignedOutToCognito();
  });

  // ME-12, D-109: two presses at once while the first delete is refused still sent one request, and one more is allowed after
  it('allows a new press once a refused delete has answered', async () => {
    const pending = held();
    await openDialog(member);
    deleteQueue.push(pending.answer);
    fireEvent.click(redButton());
    fireEvent.click(redButton());
    await settleScreen();
    pending.release(jsonResponse(STATUS_UNAVAILABLE));
    await settleScreen();
    expect(confirmsSent()).toEqual([false, true]);
    expectOnlyMessage(MESSAGES.unavailable);
    expect(isBusy()).toBe(false);
  });
});

// ---- FIRST-13

const LOCATION_DONE_KEY = `${FIRST_RUN_STORAGE_PREFIX}location-done`;
const FIRST_RUN_KEYS = [INSTALL_STEP_DONE_STORAGE_KEY, LOCATION_DONE_KEY].sort();
/** Names that only look like the prefix: they are not under it, so they stay. */
const LOOKALIKE_KEYS = ['first-run', 'my.first-run.install-done'];

/** What a device holds after the first run: the install flag, a second key under the prefix, and others. */
function seedFirstRunStorage(): void {
  localStorage.setItem(LOCATION_DONE_KEY, 'true');
  localStorage.setItem(UNRELATED_STORAGE_KEY, UNRELATED_STORAGE_VALUE);
  for (const key of LOOKALIKE_KEYS) localStorage.setItem(key, 'kept');
  seedSignInStorage();
}

const firstRunKeys = (): string[] =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(FIRST_RUN_STORAGE_PREFIX))
    .sort();

function expectOtherKeysKept(): void {
  expect(localStorage.getItem(UNRELATED_STORAGE_KEY)).toBe(UNRELATED_STORAGE_VALUE);
  for (const key of LOOKALIKE_KEYS) expect(localStorage.getItem(key)).toBe('kept');
}

const heading1 = (): string | null => document.querySelector('h1')?.textContent ?? null;

describe.each(MEMBERS)('deleting the account clears the first run, for %s', (_who, member) => {
  // FIRST-13, ME-03, D-110: every first-run key is gone before the visit goes to /logout; other keys stay
  it('removes every first-run key before the visit goes to /logout', async () => {
    let keysAtRedirect: string[] | undefined;
    replace.mockImplementation(() => {
      keysAtRedirect = Object.keys(localStorage);
    });
    await openDialog(member);
    seedFirstRunStorage();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);
    await pressRed();

    expectSignedOutToCognito();
    expect(keysAtRedirect).toBeDefined();
    expect(keysAtRedirect?.filter((key) => key.startsWith(FIRST_RUN_STORAGE_PREFIX))).toEqual([]);
    expect(keysAtRedirect).toContain(UNRELATED_STORAGE_KEY);
    expect(firstRunKeys()).toEqual([]);
    expect(localStorage.getItem(INSTALL_STEP_DONE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LOCATION_DONE_KEY)).toBeNull();
    expectOtherKeysKept();
  });

  // FIRST-13, ME-03, D-110: signing in again shows the install step, and only Continue gets past it
  it('shows the install step again at the next sign-in', async () => {
    await openDialog(member);
    seedFirstRunStorage();
    await pressRed();
    expectSignedOutToCognito();

    cleanup();
    vi.resetModules();
    const seam = await import('@shared/auth/user-manager');
    if (!isFake(seam.userManager)) throw new Error('the user-manager seam is not the fake');
    fakeUserManager = seam.userManager;
    ({ App } = await import('@app/App'));
    fakeUserManager.reset();
    await openProfile(member);

    expect(heading1()).toBe(text('firstrun.install.h1'));
    fireEvent.click(screen.getByRole('button', { name: text('common.continue') }));
    await settleScreen();
    expect(heading1()).toBe(text('profile.heading'));
  });
});

describe('the first run, when the account is not deleted', () => {
  // FIRST-13, D-110: a plain sign-out keeps the flags: they describe the device, not the member
  it('keeps every first-run key on a plain sign-out', async () => {
    await openProfile(ACTIVE);
    seedFirstRunStorage();
    fireEvent.click(screen.getByRole('button', { name: text('profile.signOut') }));
    await settleScreen();

    expectSignedOutToCognito();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);
    expectOtherKeysKept();
    expect(deleteCalls()).toHaveLength(0);
  });

  // FIRST-13, ME-03, D-110: the check call, Cancel and Escape delete nothing, so the keys stay
  it('keeps every first-run key through the check, Cancel and Escape', async () => {
    await openDialog(ACTIVE);
    seedFirstRunStorage();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);
    fireEvent.click(cancelButton());
    await settleScreen();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);

    fireEvent.click(rowButton());
    await settleScreen();
    pressEscapeIn(dialog());
    await settleScreen();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);
    expectOtherKeysKept();
    expectStillSignedIn();
  });

  // FIRST-13, ME-12, D-109, D-110: a refused or failed delete keeps the keys, since the account is still there
  it.each([
    ['a 503', answer(STATUS_UNAVAILABLE)],
    ['a 400 with a code', answer(STATUS_BAD_REQUEST, { code: 'INVALID_INPUT' })],
    ['a bare 429', answer(STATUS_TOO_MANY_REQUESTS)],
    ['no connection', offline],
  ])('keeps every first-run key when the delete answers %s', async (_name, refusal) => {
    await openDialog(ACTIVE);
    seedFirstRunStorage();
    deleteQueue.push(refusal);
    await pressRed();

    expect(confirmsSent()).toEqual([false, true]);
    expectStillSignedIn();
    expect(firstRunKeys()).toEqual(FIRST_RUN_KEYS);
    expectOtherKeysKept();
  });
});
