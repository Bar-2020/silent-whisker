import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@shared/api/api-error';
import { getProfile } from '@shared/api/profile-api';
import { SignInStatus } from './use-sign-in-status.types';

/** The first call after sign-in; `failure` is why it did not load, and `retry` asks again. */
export function useMemberProfile(status: SignInStatus) {
  const {
    data: profile,
    error,
    errorUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: status === SignInStatus.SignedIn,
  });
  // A session that ended signs the member out, and the redirect to Google follows.
  const sessionEnded = error instanceof ApiError && error.kind === 'sessionExpired';
  return {
    profile,
    failure: sessionEnded ? null : error,
    failedAt: errorUpdatedAt,
    retry: () => void refetch(),
  };
}
