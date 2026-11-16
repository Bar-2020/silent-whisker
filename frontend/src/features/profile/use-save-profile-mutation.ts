import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormSetError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { ApiError } from '@shared/api/api-error';
import { PROFILE_QUERY_KEY, updateProfile } from '@shared/api/profile-api';
import type { ProfileFormValues } from './profile-form.types';
import { describeSaveFailure } from './save-failure';
import { MEMBER_STATUS } from '@constants/member-status';

/**
 * `PATCH /profile`. Its answer replaces the cached profile, so the guard and the page see it at
 * once; a refusal is put on the form through `setFormError`, where the member reads it.
 */
export function useSaveProfileMutation(setFormError: UseFormSetError<ProfileFormValues>) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.kind === 'banned') {
        // A ban that landed meanwhile becomes the profile's own state, so the notice stays (R-08).
        queryClient.setQueryData<ProfileResponse>(
          PROFILE_QUERY_KEY,
          (profile) => profile && { ...profile, status: MEMBER_STATUS.banned }
        );
      }
      const failure = describeSaveFailure(error, t);
      if (failure) setFormError(failure.field, { message: failure.message });
    },
  });
}
