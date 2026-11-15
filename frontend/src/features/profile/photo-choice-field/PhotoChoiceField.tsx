import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { FormMessage } from '../form-message/FormMessage';
import { MemberAvatar } from '../member-avatar/MemberAvatar';
import { AvatarSize } from '../member-avatar/MemberAvatar.types';
import { PhotoChoice } from '../profile-form.types';
import type { ProfileFormValues } from '../profile-form.types';
import styles from './PhotoChoiceField.module.css';

/** Two big radio tiles, neither chosen at first: the member says on purpose whether to show the photo (D-27). */
export function PhotoChoiceField() {
  const { t } = useTranslation();
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const chosen = watch('photo');
  const message = errors.photo?.message;

  return (
    <fieldset className={styles.field} aria-describedby={message ? 'photo-error' : undefined}>
      <legend className={styles.legend}>{t('firstrun.photo.label')}</legend>
      <p className={styles.hint}>{t('firstrun.photo.hint')}</p>
      <div className={styles.choices}>
        <label className={styles.choice}>
          <input type="radio" value={PhotoChoice.Show} {...register('photo')} />
          <span className={styles.tile}>
            <span className={styles.stand}>
              <UserIcon />
            </span>
            {t('firstrun.photo.yes')}
            {chosen === PhotoChoice.Show && (
              <span className={styles.mark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
        <label className={styles.choice}>
          <input type="radio" value={PhotoChoice.Initials} {...register('photo')} />
          <span className={styles.tile}>
            <MemberAvatar fullName={watch('name')} photoUrl={null} size={AvatarSize.Small} />
            {t('firstrun.photo.no')}
            {chosen === PhotoChoice.Initials && (
              <span className={styles.mark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
      </div>
      {message && <FormMessage id="photo-error" message={message} />}
    </fieldset>
  );
}
