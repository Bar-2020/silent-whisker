import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileResponse } from '@schemas/profile.schema';
import { PROFILE_QUERY_KEY, updateProfile } from '@shared/api/profile-api';
import { isBannedFailure } from './save-failure';

/** `PATCH /profile`; its answer replaces the cached profile, so the guard and the page see it at once. */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
    },
    // A ban that landed meanwhile becomes the profile's own state, so the notice stays when the member types on (R-08).
    onError: (error) => {
      if (!isBannedFailure(error)) return;
      queryClient.setQueryData<ProfileResponse>(
        PROFILE_QUERY_KEY,
        (profile) => profile && { ...profile, status: 'banned' }
      );
    },
  });
}
