import { useFormContext } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { Link } from 'react-router';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { FormMessage } from '../form-message/FormMessage';
import type { ProfileFormValues } from '../profile-form.types';
import styles from './TermsCheckbox.module.css';

// A new tab, so what was typed in the form is not lost while the member reads (D-69).
const TERMS_LINK = <Link to="/terms" target="_blank" rel="noopener noreferrer" />;
const PRIVACY_LINK = <Link to="/privacy" target="_blank" rel="noopener noreferrer" />;

/** The required yes of the sign-up form: a box that always shows, with both texts linked (D-69). */
export function TermsCheckbox() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const message = errors.terms?.message;

  return (
    <div className={styles.field}>
      <label className={styles.check}>
        <input
          type="checkbox"
          aria-required="true"
          aria-invalid={message !== undefined}
          aria-describedby={message ? 'terms-error' : undefined}
          {...register('terms')}
        />
        <span className={styles.box}>{watch('terms') && <CheckIcon />}</span>
        <span className={styles.text}>
          <Trans
            i18nKey="firstrun.terms.label"
            components={{ terms: TERMS_LINK, privacy: PRIVACY_LINK }}
          />
        </span>
      </label>
      {message && <FormMessage id="terms-error" message={message} />}
    </div>
  );
}
