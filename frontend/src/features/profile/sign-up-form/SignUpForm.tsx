import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { signOut } from '@shared/auth/session';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { BannedNotice } from '../banned-notice/BannedNotice';
import { FormButton } from '../form-button/FormButton';
import { FormMessage } from '../form-message/FormMessage';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { Field, FormMode } from '../profile-form.types';
import { TermsCheckbox } from '../terms-checkbox/TermsCheckbox';
import { useHasGooglePhoto } from '../use-has-google-photo';
import { useProfileForm } from '../use-profile-form';
import styles from './SignUpForm.module.css';

/**
 * The first screen after the first sign-in, and again whenever the terms change (D-69, R-36): name,
 * city, the photo choice and the required terms box. It takes the place of every page until it is saved.
 */
export function SignUpForm({ profile }: { profile: ProfileResponse }) {
  const askPhoto = useHasGooglePhoto();
  return askPhoto === undefined ? null : <SignUpFormBody profile={profile} askPhoto={askPhoto} />;
}

function SignUpFormBody({ profile, askPhoto }: { profile: ProfileResponse; askPhoto: boolean }) {
  const { t } = useTranslation();
  const form = useProfileForm({ profile, mode: FormMode.SignUp, askPhoto });

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div className={styles.body}>
        <span className={styles.illustration}>
          <UserIcon />
        </span>
        <div className={styles.heading}>
          <h1>{t('firstrun.profile.h1')}</h1>
          <p className={styles.lead}>{t('firstrun.profile.lead')}</p>
        </div>
        {form.banned && <BannedNotice />}
        <ProfileFields form={form} />
        <TermsCheckbox
          checked={form.values.terms}
          onChange={(terms) => {
            form.change({ terms });
          }}
          issue={form.fieldIssues[Field.Terms]}
        />
        {form.generalIssue && <FormMessage id="profile-form-message" issue={form.generalIssue} />}
      </div>
      <div className={styles.footbar}>
        <FormButton type="submit" variant="primary" pending={form.pending}>
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
  );
}
