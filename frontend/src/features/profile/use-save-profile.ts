import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PROFILE_QUERY_KEY, updateProfile } from '@shared/api/profile-api';

/** `PATCH /profile`; its answer replaces the cached profile, so the guard and the page see it at once. */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
    },
  });
}
