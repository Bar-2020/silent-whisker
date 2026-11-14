/** Where a visitor lands after a sign-in button; the map takes this place in Phase 3. */
export const AFTER_SIGN_IN_PATH = '/profile';

/** Sends the visitor straight to Google, so Cognito's own page is never seen (D-59). */
export const SIGN_IN_IDENTITY_PROVIDER = 'Google';
export const SIGN_IN_SCOPE = 'openid email profile';

/** An ID token with less than this left is refreshed before the call that would carry it (D-59). */
export const TOKEN_REFRESH_MARGIN_SECONDS = 60;

/** Two sign-in redirects closer than this are a loop: the app stops and shows a retry screen. */
export const SIGN_IN_LOOP_SECONDS = 10;
export const SIGN_IN_STARTED_STORAGE_KEY = 'sign-in-started-at';

/** One token refresh at a time across tabs, so a rotated refresh token is never used twice (D-59). */
export const TOKEN_REFRESH_LOCK_NAME = 'silent-whisker-token-refresh';
