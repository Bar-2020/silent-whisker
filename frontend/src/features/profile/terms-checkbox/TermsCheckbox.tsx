import { Trans } from 'react-i18next';
import { Link } from 'react-router';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { FormMessage } from '../form-message/FormMessage';
import type { Issue } from '../profile-form.types';
import styles from './TermsCheckbox.module.css';

// A new tab, so what was typed in the form is not lost while the member reads (D-69).
const TERMS_LINK = <Link to="/terms" target="_blank" rel="noopener noreferrer" />;
const PRIVACY_LINK = <Link to="/privacy" target="_blank" rel="noopener noreferrer" />;

/** The required yes of the sign-up form: a box that always shows, with both texts linked (D-69). */
export function TermsCheckbox({
  checked,
  onChange,
  issue,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  issue: Issue | undefined;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={checked}
          aria-required="true"
          aria-invalid={issue !== undefined}
          aria-describedby={issue ? 'terms-error' : undefined}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        <span className={styles.box}>{checked && <CheckIcon />}</span>
        <span className={styles.text}>
          <Trans
            i18nKey="firstrun.terms.label"
            components={{ terms: TERMS_LINK, privacy: PRIVACY_LINK }}
          />
        </span>
      </label>
      {issue && <FormMessage id="terms-error" issue={issue} />}
    </div>
  );
}
