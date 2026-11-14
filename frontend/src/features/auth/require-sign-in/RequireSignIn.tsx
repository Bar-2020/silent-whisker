import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import type { ProfileResponse } from '@schemas/profile.schema';
import { ApiError } from '@shared/api/api-error';
import { getProfile } from '@shared/api/profile-api';
import { signIn } from '@shared/auth/session';
import { AuthFailedScreen } from '../auth-failed-screen/AuthFailedScreen';
import { signInUnlessLooping } from '../sign-in-loop';
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
  const [looping, setLooping] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse>();
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (status === 'signedOut') setLooping(!signInUnlessLooping(returnTo));
  }, [status, returnTo]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    getProfile()
      .then(setProfile)
      .catch((error: unknown) => {
        // A session that ended signs the member out and the effect above sends them to Google.
        if (!(error instanceof ApiError && error.kind === 'sessionExpired')) setLoadFailed(true);
      });
  }, [status, attempt]);

  if (looping) return <AuthFailedScreen kind="signIn" onRetry={() => void signIn(returnTo)} />;
  if (loadFailed) {
    return (
      <AuthFailedScreen
        kind="connection"
        onRetry={() => {
          setLoadFailed(false);
          setAttempt((count) => count + 1);
        }}
      />
    );
  }
  // F4: while `profile.terms_accepted` is false, show the sign-up form here instead of the page.
  return profile ? <Outlet context={profile} /> : null;
}
