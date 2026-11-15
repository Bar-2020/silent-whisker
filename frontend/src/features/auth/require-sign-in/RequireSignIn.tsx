import { Outlet, useLocation } from 'react-router';
import { ApiError } from '@shared/api/api-error';
import { signIn } from '@shared/auth/session';
import { AuthFailedScreen } from '../auth-failed-screen/AuthFailedScreen';
import { useMemberProfile } from '../use-member-profile';
import { useSignInStatus } from '../use-sign-in-status';
import { SignInStatus } from '../use-sign-in-status.types';

/**
 * Every route below it needs a sign-in (R-22): a signed-out visit goes to Google and comes back to
 * the same page (D-83). Once signed in it loads the profile, which tells whether the terms were
 * accepted, and hands it to the page through the outlet context. The profile feature's route
 * element below it shows the sign-up form while the terms are not accepted (D-105).
 */
export function RequireSignIn() {
  const { pathname, search, hash } = useLocation();
  const returnTo = `${pathname}${search}${hash}`;
  const status = useSignInStatus(returnTo);
  const { profile, failure, failedAt, retry } = useMemberProfile(status);

  if (status === SignInStatus.RedirectStopped) {
    return <AuthFailedScreen kind="signIn" onRetry={() => void signIn(returnTo)} />;
  }
  if (failure) {
    const waitSeconds = failure instanceof ApiError ? failure.retryAfterSeconds : undefined;
    // The key makes a new failure a new screen, so its wait starts again.
    return waitSeconds === undefined ? (
      <AuthFailedScreen key={failedAt} kind="connection" onRetry={retry} />
    ) : (
      <AuthFailedScreen
        key={failedAt}
        kind="rateLimited"
        waitSeconds={waitSeconds}
        onRetry={retry}
      />
    );
  }
  return profile ? <Outlet context={profile} /> : null;
}
