import { ErrorResponse, type User } from 'oidc-client-ts';
import { MS_PER_SECOND } from '@constants/cost';
import {
  SIGN_IN_IDENTITY_PROVIDER,
  TOKEN_REFRESH_LOCK_NAME,
  TOKEN_REFRESH_MARGIN_SECONDS,
} from '@constants/sign-in';
import auth from '@constants/auth.json';
import { COGNITO_DOMAIN, userManager } from './user-manager';

/** Goes to Google through Cognito's code flow with PKCE; `returnTo` is where the visitor comes back to. */
export function signIn(returnTo: string): Promise<void> {
  return userManager.signinRedirect({
    state: returnTo,
    extraQueryParams: { identity_provider: SIGN_IN_IDENTITY_PROVIDER },
  });
}

/** Drops the tokens of this browser only: the session ended on the server, or the member signed out. */
export const forgetSession = (): Promise<void> => userManager.removeUser();

let signingOut = false;

/** True from the moment the member presses Sign out: the page is leaving, so nothing may start a sign-in. */
export const isSigningOut = (): boolean => signingOut;

/** Removes every token from this browser, then ends Cognito's own session so the next sign-in asks again (SHELL-05). */
export async function signOut(): Promise<void> {
  signingOut = true;
  await forgetSession();
  await userManager.clearStaleState();
  const logout = new URL(`${COGNITO_DOMAIN}/logout`);
  logout.searchParams.set('client_id', auth.client_id);
  logout.searchParams.set('logout_uri', `${window.location.origin}/`);
  window.location.replace(logout);
}

const expiresSoon = (user: User): boolean =>
  user.profile.exp - Date.now() / MS_PER_SECOND < TOKEN_REFRESH_MARGIN_SECONDS;

/** Cognito answered and refused: the refresh token is revoked or expired, so the session is over. */
async function refresh(): Promise<User | null> {
  try {
    return await userManager.signinSilent();
  } catch (error) {
    if (!(error instanceof ErrorResponse)) throw error;
    await forgetSession();
    return null;
  }
}

/**
 * The ID token the API wants, not the access token (D-59), refreshed when it is about to expire.
 * Null means signed out. The lock and the read inside it keep two tabs from spending one refresh
 * token twice: the second tab finds the first one's new tokens in storage.
 */
export function getIdToken(): Promise<string | null> {
  return navigator.locks.request(TOKEN_REFRESH_LOCK_NAME, async () => {
    const user = await userManager.getUser();
    if (!user) return null;
    const current = expiresSoon(user) ? await refresh() : user;
    return current?.id_token ?? null;
  });
}
