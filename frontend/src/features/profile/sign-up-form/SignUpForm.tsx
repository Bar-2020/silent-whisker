import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { signOut } from '@shared/auth/session';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { buildProfileUpdate } from '../build-profile-update';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { FormButton } from '../form-button/FormButton';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { createProfileFormSchema } from '../profile-form.schema';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import { TermsCheckbox } from '../terms-checkbox/TermsCheckbox';
import { SaveFailureMessage } from '../save-failure-message/SaveFailureMessage';
import { useSaveProfile } from '../use-save-profile';
import styles from './SignUpForm.module.css';

/**
 * The first screen after the first sign-in, and again whenever the terms change (D-69, R-36): name,
 * city, the photo choice and the required terms box. It takes the place of every page until it is saved.
 */
export function SignUpForm({
  profile,
  hasGooglePhoto,
}: {
  profile: ProfileResponse;
  hasGooglePhoto: boolean;
}) {
  const { t } = useTranslation();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(createProfileFormSchema(t, true)),
    defaultValues: {
      name: '',
      city: '',
      photo: hasGooglePhoto ? PhotoChoice.Unanswered : PhotoChoice.Initials,
      terms: false,
    },
  });
  const save = useSaveProfile(form.setError);
  // Busy from the press (the check runs first) until the answer: a second press does nothing (FIRST-03).
  const pending = save.isPending || form.formState.isSubmitting;
  const submit = form.handleSubmit((values) => {
    if (pending) return;
    save.mutate({ ...buildProfileUpdate(values, hasGooglePhoto), accept_terms: true });
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <div className={styles.body}>
          <span className={styles.illustration}>
            <UserIcon />
          </span>
          <div className={styles.heading}>
            <h1>{t('firstrun.profile.h1')}</h1>
            <p className={styles.lead}>{t('firstrun.profile.lead')}</p>
          </div>
          {profile.status === 'banned' && <BannedAccountNotice />}
          <ProfileFields hasGooglePhoto={hasGooglePhoto} />
          <TermsCheckbox />
          <SaveFailureMessage />
        </div>
        <div className={styles.footbar}>
          <FormButton type="submit" variant="primary" pending={pending}>
            {t('common.continue')}
          </FormButton>
          <FormButton
            type="button"
            variant="quiet"
            pending={false}
            onClick={() => {
              void signOut();
            }}
          >
            {t('profile.signOut')}
          </FormButton>
        </div>
      </form>
    </FormProvider>
  );
}
