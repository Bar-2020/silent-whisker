import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { buildProfileUpdate } from '../build-profile-update';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { FormButton } from '../form-button/FormButton';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { createProfileFormSchema } from '../profile-form.schema';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import { SaveFailureMessage } from '../save-failure-message/SaveFailureMessage';
import { useSaveProfile } from '../use-save-profile';
import styles from './EditProfileForm.module.css';

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
      name: profile.display_name ?? '',
      city: profile.city ?? '',
      photo: hasGooglePhoto && profile.show_google_photo ? PhotoChoice.Show : PhotoChoice.Initials,
      terms: false,
    },
  });
  const save = useSaveProfile(form.setError);
  const { isDirty, isSubmitting } = form.formState;
  const pending = save.isPending || isSubmitting;
  const submit = form.handleSubmit((values) => {
    // An edit that changes nothing sends nothing, so it costs no write and no text check (D-61).
    if (!isDirty) {
      onClose();
      return;
    }
    if (pending) return;
    save.mutate(buildProfileUpdate(values, hasGooglePhoto), { onSuccess: onClose });
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
        {profile.status === 'banned' && <BannedAccountNotice />}
        <ProfileFields hasGooglePhoto={hasGooglePhoto} />
        {hasGooglePhoto && <p className={styles.note}>{t('profile.edit.photoHint')}</p>}
        <SaveFailureMessage />
        <div className={styles.buttons}>
          <FormButton type="submit" variant="primary" pending={pending}>
            {t('common.save')}
          </FormButton>
          <FormButton type="button" variant="quiet" pending={false} onClick={onClose}>
            {t('common.cancel')}
          </FormButton>
        </div>
      </form>
    </FormProvider>
  );
}
