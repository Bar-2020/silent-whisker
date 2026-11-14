import { Outlet, useLocation } from 'react-router';
import { ApiError } from '@shared/api/api-error';
import { signIn } from '@shared/auth/session';
import { AuthFailedScreen } from '../auth-failed-screen/AuthFailedScreen';
import { useMemberProfile } from '../use-member-profile';
import { useSignInRedirect } from '../use-sign-in-redirect';
import { useSignInStatus } from '../use-sign-in-status';

/**
 * Every route below it needs a sign-in (R-22): a signed-out visit goes to Google and comes back to
 * the same page (D-83). Once signed in it loads the profile, which tells whether the terms were
 * accepted, and hands it to the page through the outlet context.
 */
export function RequireSignIn() {
  const { pathname, search, hash } = useLocation();
  const returnTo = `${pathname}${search}${hash}`;
  const status = useSignInStatus();
  const redirectStopped = useSignInRedirect(status, returnTo);
  const { profile, failure, retry } = useMemberProfile(status);

  if (redirectStopped) {
    return <AuthFailedScreen kind="signIn" onRetry={() => void signIn(returnTo)} />;
  }
  if (failure) {
    const waitSeconds = failure instanceof ApiError ? failure.retryAfterSeconds : undefined;
    return (
      <AuthFailedScreen
        kind={waitSeconds === undefined ? 'connection' : 'rateLimited'}
        waitSeconds={waitSeconds}
        onRetry={retry}
      />
    );
  }
  // F4: while `profile.terms_accepted` is false, show the sign-up form here instead of the page.
  return profile ? <Outlet context={profile} /> : null;
}
