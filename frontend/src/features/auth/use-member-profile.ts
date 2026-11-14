import { useEffect, useState } from 'react';
import type { ProfileResponse } from '@schemas/profile.schema';
import { ApiError } from '@shared/api/api-error';
import { getProfile } from '@shared/api/profile-api';
import type { SignInStatus } from './use-sign-in-status.types';

/** The first call after sign-in; `failure` is why it did not load, and `retry` asks again. */
export function useMemberProfile(status: SignInStatus) {
  const [profile, setProfile] = useState<ProfileResponse>();
  const [failure, setFailure] = useState<Error>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== 'signedIn') return;
    getProfile()
      .then(setProfile)
      .catch((error: unknown) => {
        // A session that ended signs the member out, and the redirect to Google follows.
        if (error instanceof ApiError && error.kind === 'sessionExpired') return;
        setFailure(error instanceof Error ? error : new Error());
      });
  }, [status, attempt]);

  const retry = () => {
    setFailure(undefined);
    setAttempt((count) => count + 1);
  };
  return { profile, failure, retry };
}
