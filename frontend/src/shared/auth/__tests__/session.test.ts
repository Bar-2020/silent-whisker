// @vitest-environment jsdom
import { ErrorResponse } from 'oidc-client-ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { getIdToken, signIn, signOut } from '@shared/auth/session';
import {
  ACCESS_TOKEN,
  FAKE_COGNITO_DOMAIN,
  fakeUserManager,
  ID_TOKEN,
  makeUser,
  OIDC_STORAGE_KEYS,
  REFRESHED_ACCESS_TOKEN,
  REFRESHED_ID_TOKEN,
  seedSignInStorage,
  stubNavigatorLocks,
  UNRELATED_STORAGE_KEY,
  UNRELATED_STORAGE_VALUE,
  unstubNavigatorLocks,
} from '@shared/test-support/sign-in-fakes';
import auth from '@constants/auth.json';
import {
  OIDC_STORAGE_PREFIX,
  SIGN_IN_IDENTITY_PROVIDER,
  SIGN_IN_STARTED_STORAGE_KEY,
  TOKEN_REFRESH_LOCK_NAME,
  TOKEN_REFRESH_MARGIN_SECONDS,
} from '@constants/sign-in';

vi.mock('@shared/auth/user-manager', async () => {
  const { fakeUserManager: fake, FAKE_COGNITO_DOMAIN: domain } =
    await import('@shared/test-support/sign-in-fakes');
  return { userManager: fake, COGNITO_DOMAIN: domain };
});

const NOW = new Date('2026-11-14T10:00:00Z');
const ORIGIN = 'https://app.example.test';

let lockRequest: ReturnType<typeof stubNavigatorLocks>;
const replace = vi.fn<(url: string) => void>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  fakeUserManager.reset();
  replace.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  lockRequest = stubNavigatorLocks();
  vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/profile`, replace });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  unstubNavigatorLocks();
});

const expiring = (state?: unknown): ReturnType<typeof makeUser> =>
  makeUser({ secondsLeft: TOKEN_REFRESH_MARGIN_SECONDS - 1, state });

/** What the library does on a good silent sign-in: it stores the new user and returns it. */
function refreshesTo(user: ReturnType<typeof makeUser>): void {
  fakeUserManager.signinSilent.mockImplementation(async () => {
    await Promise.resolve();
    fakeUserManager.setUser(user);
    return user;
  });
}

const refreshed = (): ReturnType<typeof makeUser> =>
  makeUser({ idToken: REFRESHED_ID_TOKEN, accessToken: REFRESHED_ACCESS_TOKEN });

describe('signIn', () => {
  // SHELL-12, D-59: straight to Google, with the return page as the library's state
  it('starts the Google sign-in with the return page kept', async () => {
    await signIn('/spots/x?a=1#h');
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinRedirect).toHaveBeenCalledWith({
      state: '/spots/x?a=1#h',
      extraQueryParams: { identity_provider: SIGN_IN_IDENTITY_PROVIDER },
    });
  });
});

describe('getIdToken', () => {
  // SHELL-13, D-59: the ID token holds the Google picture, the access token is never sent
  it('returns the ID token, not the access token', async () => {
    fakeUserManager.setUser(makeUser());
    const token = await getIdToken();
    expect(token).toBe(ID_TOKEN);
    expect(token).not.toBe(ACCESS_TOKEN);
    expect(fakeUserManager.signinSilent).not.toHaveBeenCalled();
  });

  // SHELL-16, D-59: a call whose token is still good takes no lock and no refresh
  it('takes no lock for a token that has at least the margin left', async () => {
    fakeUserManager.setUser(makeUser({ secondsLeft: TOKEN_REFRESH_MARGIN_SECONDS }));
    await expect(getIdToken()).resolves.toBe(ID_TOKEN);
    expect(lockRequest).not.toHaveBeenCalled();
    expect(fakeUserManager.signinSilent).not.toHaveBeenCalled();
  });

  // SHELL-13, D-59
  it('returns null, with no lock, when nobody is signed in', async () => {
    await expect(getIdToken()).resolves.toBeNull();
    expect(fakeUserManager.signinSilent).not.toHaveBeenCalled();
    expect(lockRequest).not.toHaveBeenCalled();
  });

  // SHELL-16, D-59: another tab refreshed while this call waited for the lock: the lock re-reads first
  it('does not refresh when the user it re-reads inside the lock is no longer expiring', async () => {
    const other = refreshed();
    fakeUserManager.getUser.mockResolvedValueOnce(expiring()).mockResolvedValue(other);
    await expect(getIdToken()).resolves.toBe(REFRESHED_ID_TOKEN);
    expect(lockRequest).toHaveBeenCalledTimes(1);
    expect(fakeUserManager.signinSilent).not.toHaveBeenCalled();
  });

  // SHELL-16, D-59: at the margin there is no refresh; one second under it there is
  it.each([
    ['one second above the margin', TOKEN_REFRESH_MARGIN_SECONDS + 1, false],
    ['exactly the margin', TOKEN_REFRESH_MARGIN_SECONDS, false],
    ['one second under the margin', TOKEN_REFRESH_MARGIN_SECONDS - 1, true],
  ])('refreshes %s: %s', async (_name, secondsLeft, shouldRefresh) => {
    fakeUserManager.setUser(makeUser({ secondsLeft }));
    refreshesTo(refreshed());
    const token = await getIdToken();
    expect(fakeUserManager.signinSilent).toHaveBeenCalledTimes(shouldRefresh ? 1 : 0);
    expect(token).toBe(shouldRefresh ? REFRESHED_ID_TOKEN : ID_TOKEN);
  });

  // SHELL-16, D-59, D-104: the refresh runs inside the one lock shared by all tabs
  it('refreshes inside the named lock', async () => {
    fakeUserManager.setUser(expiring());
    refreshesTo(refreshed());
    await getIdToken();
    expect(lockRequest).toHaveBeenCalledTimes(1);
    expect(lockRequest.mock.calls[0][0]).toBe(TOKEN_REFRESH_LOCK_NAME);
  });

  // SHELL-16, D-59: two tabs ask at once, one refresh, both get the new token
  it('makes one refresh for two calls at once, and both get the new ID token', async () => {
    fakeUserManager.setUser(expiring());
    refreshesTo(refreshed());
    const [first, second] = await Promise.all([getIdToken(), getIdToken()]);
    expect(fakeUserManager.signinSilent).toHaveBeenCalledTimes(1);
    expect(first).toBe(REFRESHED_ID_TOKEN);
    expect(second).toBe(REFRESHED_ID_TOKEN);
  });

  // SHELL-16, D-59: many tabs at once is still one refresh
  it('makes one refresh for five calls at once', async () => {
    fakeUserManager.setUser(expiring());
    refreshesTo(refreshed());
    const five = Array.from({ length: 5 }, () => getIdToken());
    const tokens = await Promise.all(five);
    expect(fakeUserManager.signinSilent).toHaveBeenCalledTimes(1);
    expect(new Set(tokens)).toEqual(new Set([REFRESHED_ID_TOKEN]));
  });

  // SHELL-16, D-59: a call after the refresh finds the new tokens
  it('finds the new tokens on a later call, with no second refresh', async () => {
    fakeUserManager.setUser(expiring());
    refreshesTo(refreshed());
    await getIdToken();
    await expect(getIdToken()).resolves.toBe(REFRESHED_ID_TOKEN);
    expect(fakeUserManager.signinSilent).toHaveBeenCalledTimes(1);
  });

  // SHELL-16, D-59: a refused refresh token ends the session
  it('removes the tokens and returns null when the refresh is refused', async () => {
    fakeUserManager.setUser(expiring());
    fakeUserManager.signinSilent.mockRejectedValue(new ErrorResponse({ error: 'invalid_grant' }));
    await expect(getIdToken()).resolves.toBeNull();
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    await expect(fakeUserManager.getUser()).resolves.toBeNull();
  });

  // SHELL-16, D-59: two calls at once, the refresh is refused: one refresh, both see no session
  it('refreshes once and ends the session for both calls when the refresh is refused', async () => {
    fakeUserManager.setUser(expiring());
    fakeUserManager.signinSilent.mockRejectedValue(new ErrorResponse({ error: 'invalid_grant' }));
    const results = await Promise.all([getIdToken(), getIdToken()]);
    expect(results).toEqual([null, null]);
    expect(fakeUserManager.signinSilent).toHaveBeenCalledTimes(1);
  });

  // SHELL-16, D-59: no connection is not a refusal, the tokens stay for the next try
  it('rethrows an error that is not a refusal and keeps the tokens', async () => {
    const offline = new TypeError('Failed to fetch');
    fakeUserManager.setUser(expiring());
    fakeUserManager.signinSilent.mockRejectedValue(offline);
    await expect(getIdToken()).rejects.toBe(offline);
    expect(fakeUserManager.removeUser).not.toHaveBeenCalled();
    await expect(fakeUserManager.getUser()).resolves.not.toBeNull();
  });
});

describe('signOut', () => {
  // SHELL-14, D-59, R-22: every oidc.* key and the sign-in marker go, nothing else does
  it('empties the sign-in records from both storages and keeps unrelated keys', async () => {
    fakeUserManager.setUser(makeUser());
    seedSignInStorage();
    await signOut();
    const left = Object.keys(localStorage).filter((key) => key.startsWith(OIDC_STORAGE_PREFIX));
    expect(left).toEqual([]);
    expect(OIDC_STORAGE_KEYS.filter((key) => localStorage.getItem(key) !== null)).toEqual([]);
    expect(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(UNRELATED_STORAGE_KEY)).toBe(UNRELATED_STORAGE_VALUE);
  });

  // SHELL-14, D-59, R-22: the tokens go first, then Cognito's own session ends
  it('removes the tokens, then goes to Cognito /logout', async () => {
    fakeUserManager.setUser(makeUser());
    await signOut();
    expect(fakeUserManager.removeUser).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);

    const removedAt = fakeUserManager.removeUser.mock.invocationCallOrder[0];
    const leftAt = replace.mock.invocationCallOrder[0];
    expect(removedAt).toBeLessThan(leftAt);

    const url = new URL(replace.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(`${FAKE_COGNITO_DOMAIN}/logout`);
    expect(url.searchParams.get('client_id')).toBe(auth.client_id);
    expect(url.searchParams.get('logout_uri')).toBe(`${ORIGIN}/`);
    expect([...url.searchParams.keys()].sort()).toEqual(['client_id', 'logout_uri']);
  });

  // SHELL-14, D-59: after sign-out no call can carry a token
  it('leaves no ID token behind', async () => {
    fakeUserManager.setUser(makeUser());
    await signOut();
    await expect(getIdToken()).resolves.toBeNull();
  });
});
