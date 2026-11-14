import { MS_PER_SECOND } from '@constants/cost';
import { SIGN_IN_LOOP_SECONDS, SIGN_IN_STARTED_STORAGE_KEY } from '@constants/sign-in';
import { isSigningOut, signIn } from '@shared/auth/session';

/**
 * Sends the visitor to Google unless that was already done a moment ago: a sign-in that returns
 * and is refused again would otherwise bounce between the app and Google for ever. False means
 * it did not go, and the caller shows a screen with a retry button.
 */
export function signInUnlessLooping(returnTo: string): boolean {
  if (isSigningOut()) return true;
  try {
    const last = Number(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY));
    if (Date.now() - last < SIGN_IN_LOOP_SECONDS * MS_PER_SECOND) return false;
    sessionStorage.setItem(SIGN_IN_STARTED_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage is blocked: the loop cannot be seen here, and the callback checks the tokens were kept.
  }
  void signIn(returnTo);
  return true;
}
