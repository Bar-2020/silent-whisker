import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import { FormMessage } from '../form-message/FormMessage';
import type { Issue } from '../profile-form.types';
import styles from './ProfileTextField.module.css';

/** A labelled text box with its hint and, once there is one, its error in words (DESIGN.md, Inputs). */
export function ProfileTextField({
  id,
  labelKey,
  placeholderKey,
  hintKey,
  autoComplete,
  value,
  onChange,
  issue,
}: {
  id: string;
  labelKey: ParseKeys;
  placeholderKey: ParseKeys;
  hintKey: ParseKeys;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  issue: Issue | undefined;
}) {
  const { t } = useTranslation();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        className={styles.input}
        type="text"
        autoComplete={autoComplete}
        placeholder={t(placeholderKey)}
        value={value}
        aria-required="true"
        aria-invalid={issue !== undefined}
        aria-describedby={issue ? `${hintId} ${errorId}` : hintId}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={hintId} className={styles.hint}>
        {t(hintKey)}
      </p>
      {issue && <FormMessage id={errorId} issue={issue} />}
    </div>
  );
}
