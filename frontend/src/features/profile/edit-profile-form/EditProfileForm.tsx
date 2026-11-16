import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { buildProfileUpdate } from '../build-profile-update';
import { CancelButton } from '../cancel-button/CancelButton';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { createProfileFormSchema } from '../profile-form.schema';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import { ProfileSaveErrorMessage } from '../profile-save-error-message/ProfileSaveErrorMessage';
import { useSaveProfileMutation } from '../use-save-profile-mutation';
import styles from './EditProfileForm.module.css';
import { MEMBER_STATUS } from '@constants/member-status';

/** The same fields and errors as the sign-up form, to change the name, the city or the photo choice later (D-108). */
export function EditProfileForm({
  profile,
  hasGooglePhoto,
  onClose,
}: {
  profile: ProfileResponse;
  hasGooglePhoto: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileFormSchema(t, false)),
    defaultValues: {
      fullName: profile.display_name ?? '',
      cityName: profile.city ?? '',
      photoChoice:
        hasGooglePhoto && profile.show_google_photo ? PhotoChoice.Show : PhotoChoice.Initials,
      termsAccepted: false,
    },
  });
  const saveProfileMutation = useSaveProfileMutation(form.setError);
  const { isDirty, isSubmitting } = form.formState;
  // Busy from the press (the check runs first) until the answer is back: a second press does nothing.
  const isSubmitPending = isSubmitting || saveProfileMutation.isPending;
  const submit = form.handleSubmit((values) => {
    // An edit that changes nothing sends nothing, so it costs no write and no text check (D-61).
    if (!isDirty) {
      onClose();
      return;
    }
    if (isSubmitPending) return;
    saveProfileMutation.mutate(buildProfileUpdate(values, hasGooglePhoto), { onSuccess: onClose });
  });

  return (
    <FormProvider {...form}>
      <form
        className={styles.form}
        noValidate
        aria-labelledby="edit-profile-title"
        onSubmit={(event) => void submit(event)}
      >
        <h2 id="edit-profile-title">{t('profile.edit.title')}</h2>
        {profile.status === MEMBER_STATUS.banned && <BannedAccountNotice />}
        <ProfileFields hasGooglePhoto={hasGooglePhoto} />
        {hasGooglePhoto && <p className={styles.note}>{t('profile.edit.photoHint')}</p>}
        <ProfileSaveErrorMessage />
        <div className={styles.buttons}>
          <FormButton type="submit" variant={FormButtonVariant.Primary} pending={isSubmitPending}>
            {t('common.save')}
          </FormButton>
          <CancelButton onClick={onClose} />
        </div>
      </form>
    </FormProvider>
  );
}
