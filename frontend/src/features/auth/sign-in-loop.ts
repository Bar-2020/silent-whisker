import { MS_PER_SECOND } from '@constants/cost';
import { SIGN_IN_LOOP_SECONDS, SIGN_IN_STARTED_STORAGE_KEY } from '@constants/sign-in';
import { isSigningOut, signIn } from '@shared/auth/session';

/** One redirect per page address at a time: React may run the guard's effect twice (SHELL-12). */
const inFlight = new Map<string, Promise<boolean>>();

async function start(returnTo: string): Promise<boolean> {
  if (isSigningOut()) return true;
  try {
    const last = Number(sessionStorage.getItem(SIGN_IN_STARTED_STORAGE_KEY));
    if (Date.now() - last < SIGN_IN_LOOP_SECONDS * MS_PER_SECOND) return false;
    sessionStorage.setItem(SIGN_IN_STARTED_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage is blocked: the loop cannot be seen here, and the callback checks the tokens were kept.
  }
  try {
    // The library settles this only if the browser brings the page back from its cache.
    await signIn(returnTo);
    return true;
  } catch {
    return false;
  }
}

/** The browser brought the page back, so the redirect that was on its way did not leave (SHELL-21). */
export const forgetPendingRedirects = (): void => {
  inFlight.clear();
};

/**
 * Sends the visitor to Google unless that was already done a moment ago: a sign-in that returns
 * and is refused again would otherwise bounce between the app and Google for ever. False means
 * it did not go (a loop, or the redirect could not start), and the caller shows a screen with a
 * retry button.
 */
export function signInUnlessLooping(returnTo: string): Promise<boolean> {
  const running = inFlight.get(returnTo);
  if (running) return running;
  const attempt = start(returnTo).finally(() => inFlight.delete(returnTo));
  inFlight.set(returnTo, attempt);
  return attempt;
}
