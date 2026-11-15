import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { BannedNotice } from '../banned-notice/BannedNotice';
import { FormButton } from '../form-button/FormButton';
import { FormMessage } from '../form-message/FormMessage';
import { ProfileFields } from '../profile-fields/ProfileFields';
import { FormMode } from '../profile-form.types';
import { useHasGooglePhoto } from '../use-has-google-photo';
import { useProfileForm } from '../use-profile-form';
import styles from './EditProfileForm.module.css';

/** The same fields and errors as the sign-up form, to change the name, the city or the photo choice later (D-108). */
export function EditProfileForm({
  profile,
  onClose,
}: {
  profile: ProfileResponse;
  onClose: () => void;
}) {
  const askPhoto = useHasGooglePhoto();
  return askPhoto === undefined ? null : (
    <EditProfileFormBody profile={profile} askPhoto={askPhoto} onClose={onClose} />
  );
}

function EditProfileFormBody({
  profile,
  askPhoto,
  onClose,
}: {
  profile: ProfileResponse;
  askPhoto: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const form = useProfileForm({ profile, mode: FormMode.Edit, askPhoto, onSaved: onClose });

  return (
    <form
      className={styles.form}
      noValidate
      aria-labelledby="edit-profile-title"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h2 id="edit-profile-title">{t('profile.edit.title')}</h2>
      {form.banned && <BannedNotice />}
      <ProfileFields form={form} />
      {askPhoto && <p className={styles.note}>{t('profile.edit.photoHint')}</p>}
      {form.generalIssue && <FormMessage id="profile-form-message" issue={form.generalIssue} />}
      <div className={styles.buttons}>
        <FormButton type="submit" variant="primary" pending={form.pending}>
          {t('common.save')}
        </FormButton>
        <FormButton type="button" variant="quiet" pending={false} onClick={onClose}>
          {t('common.cancel')}
        </FormButton>
      </div>
    </form>
  );
}
