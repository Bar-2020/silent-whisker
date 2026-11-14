import { User } from 'oidc-client-ts';
import { vi } from 'vite-plus/test';

import { COUNTER_TTL_SECONDS, MS_PER_SECOND } from '@constants/cost';
import type { ProfileResponse } from '@schemas/profile.schema';
import type { Listener, LockRequest, UserOptions } from './sign-in-fakes.types';

/** The fakes the sign-in tests share: one seam, `@shared/auth/user-manager`, replaced by `vi.mock` (D-59). */

export const FAKE_COGNITO_DOMAIN = 'https://auth.example.test';

export const ID_TOKEN = 'id-token-first';
export const ACCESS_TOKEN = 'access-token-first';
const REFRESH_TOKEN = 'refresh-token-first';
export const REFRESHED_ID_TOKEN = 'id-token-refreshed';
export const REFRESHED_ACCESS_TOKEN = 'access-token-refreshed';

export const PROFILE: ProfileResponse = {
  display_name: 'דנה ‏Dana',
  city: null,
  avatar_url: null,
  show_google_photo: false,
  status: 'active',
  terms_accepted: true,
};

/** Far enough ahead that no test sees the token expire. */
const FAR_SECONDS = COUNTER_TTL_SECONDS;

export function makeUser({
  idToken = ID_TOKEN,
  accessToken = ACCESS_TOKEN,
  refreshToken = REFRESH_TOKEN,
  secondsLeft = FAR_SECONDS,
  state,
}: UserOptions = {}): User {
  const now = Math.floor(Date.now() / MS_PER_SECOND);
  const exp = now + secondsLeft;
  return new User({
    id_token: idToken,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_at: exp,
    profile: { sub: 'user-1', iss: 'https://issuer.test', aud: 'client', exp, iat: now },
    userState: state,
  });
}

let current: User | null = null;
let listeners: Listener[] = [];

export const fakeUserManager = {
  getUser: vi.fn<() => Promise<User | null>>(),
  removeUser: vi.fn<() => Promise<void>>(),
  clearStaleState: vi.fn<() => Promise<void>>(),
  signinRedirect: vi.fn<(args: unknown) => Promise<void>>(),
  signinRedirectCallback: vi.fn<() => Promise<User>>(),
  signinSilent: vi.fn<() => Promise<User | null>>(),
  events: { addUserUnloaded: vi.fn<(callback: Listener) => () => void>() },

  /** The user the library "has in storage". */
  setUser(user: User | null): void {
    current = user;
  },

  /** Back to a signed-out visitor with no pending answers; call before every test. */
  reset(): void {
    current = null;
    listeners = [];
    fakeUserManager.getUser.mockReset().mockImplementation(() => Promise.resolve(current));
    fakeUserManager.removeUser.mockReset().mockImplementation(() => {
      current = null;
      for (const callback of [...listeners]) callback();
      return Promise.resolve();
    });
    fakeUserManager.clearStaleState.mockReset().mockResolvedValue(undefined);
    fakeUserManager.signinRedirect.mockReset().mockResolvedValue(undefined);
    fakeUserManager.signinRedirectCallback
      .mockReset()
      .mockRejectedValue(new Error('signinRedirectCallback was not set up by the test'));
    fakeUserManager.signinSilent
      .mockReset()
      .mockRejectedValue(new Error('signinSilent was not set up by the test'));
    fakeUserManager.events.addUserUnloaded.mockReset().mockImplementation((callback) => {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((entry) => entry !== callback);
      };
    });
  },
};

fakeUserManager.reset();

/** jsdom has no `navigator.locks`: a fake that runs the callbacks strictly one after another. */
export function stubNavigatorLocks(): ReturnType<typeof vi.fn<LockRequest>> {
  let tail: Promise<unknown> = Promise.resolve();
  const request = vi.fn<LockRequest>((_name, callback) => {
    const run = tail.then(() => callback());
    tail = run.catch(() => undefined);
    return run;
  });
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
  return request;
}

export function unstubNavigatorLocks(): void {
  Reflect.deleteProperty(navigator, 'locks');
}

export function jsonResponse(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}
