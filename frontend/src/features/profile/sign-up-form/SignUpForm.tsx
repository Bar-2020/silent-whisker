import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { signOut } from '@shared/auth/session';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { buildProfileUpdate } from '../build-profile-update';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { FirstRunFootbar } from '../first-run-footbar/FirstRunFootbar';
import { FirstRunHeading } from '../first-run-heading/FirstRunHeading';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { createProfileFormSchema } from '../profile-form.schema';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import { TermsCheckbox } from '../terms-checkbox/TermsCheckbox';
import { ProfileSaveErrorMessage } from '../profile-save-error-message/ProfileSaveErrorMessage';
import { useSaveProfileMutation } from '../use-save-profile-mutation';
import styles from './SignUpForm.module.css';
import { MEMBER_STATUS } from '@constants/member-status';

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
      fullName: '',
      cityId: null,
      photoChoice: hasGooglePhoto ? PhotoChoice.Unanswered : PhotoChoice.Initials,
      termsAccepted: false,
    },
  });
  const saveProfileMutation = useSaveProfileMutation(form.setError);
  // Busy from the press (the check runs first) until the answer: a second press does nothing (FIRST-03).
  const isSubmitPending = form.formState.isSubmitting || saveProfileMutation.isPending;
  const submit = form.handleSubmit((values) => {
    if (isSubmitPending) return;
    saveProfileMutation.mutate({
      ...buildProfileUpdate(values, hasGooglePhoto),
      accept_terms: true,
    });
  });

  return (
    <FormProvider {...form}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <div className={styles.body}>
          <FirstRunHeading
            icon={<UserIcon />}
            title={t('firstrun.profile.h1')}
            lead={t('firstrun.profile.lead')}
          />
          {profile.status === MEMBER_STATUS.banned && <BannedAccountNotice />}
          <ProfileFields hasGooglePhoto={hasGooglePhoto} />
          <TermsCheckbox />
          <ProfileSaveErrorMessage />
        </div>
        <FirstRunFootbar>
          <FormButton type="submit" variant={FormButtonVariant.Primary} pending={isSubmitPending}>
            {t('common.continue')}
          </FormButton>
          <FormButton
            type="button"
            variant={FormButtonVariant.Quiet}
            pending={false}
            onClick={() => {
              void signOut();
            }}
          >
            {t('profile.signOut')}
          </FormButton>
        </FirstRunFootbar>
      </form>
    </FormProvider>
  );
}
