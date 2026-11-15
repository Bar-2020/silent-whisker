import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { UserIcon } from '@shared/components/icon/UserIcon';
import { Avatar } from '../avatar/Avatar';
import { FormMessage } from '../form-message/FormMessage';
import { PhotoChoice } from '../profile-form.types';
import type { Issue } from '../profile-form.types';
import styles from './PhotoChoiceField.module.css';

/** Two big radio tiles, neither chosen at first: the member says on purpose whether to show the photo (D-27). */
export function PhotoChoiceField({
  name,
  value,
  onChange,
  issue,
}: {
  name: string;
  value: PhotoChoice;
  onChange: (choice: PhotoChoice) => void;
  issue: Issue | undefined;
}) {
  const { t } = useTranslation();

  return (
    <fieldset className={styles.field} aria-describedby={issue ? 'photo-error' : undefined}>
      <legend className={styles.legend}>{t('firstrun.photo.label')}</legend>
      <p className={styles.hint}>{t('firstrun.photo.hint')}</p>
      <div className={styles.choices}>
        <label className={styles.choice}>
          <input
            type="radio"
            name="photo"
            checked={value === PhotoChoice.Show}
            onChange={() => {
              onChange(PhotoChoice.Show);
            }}
          />
          <span className={styles.tile}>
            <span className={styles.stand}>
              <UserIcon />
            </span>
            {t('firstrun.photo.yes')}
            {value === PhotoChoice.Show && (
              <span className={styles.mark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name="photo"
            checked={value === PhotoChoice.Initials}
            onChange={() => {
              onChange(PhotoChoice.Initials);
            }}
          />
          <span className={styles.tile}>
            <Avatar name={name} photoUrl={null} size="small" />
            {t('firstrun.photo.no')}
            {value === PhotoChoice.Initials && (
              <span className={styles.mark}>
                <CheckIcon />
              </span>
            )}
          </span>
        </label>
      </div>
      {issue && <FormMessage id="photo-error" issue={issue} />}
    </fieldset>
  );
}
