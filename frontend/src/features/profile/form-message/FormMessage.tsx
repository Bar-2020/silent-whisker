import { Trans } from 'react-i18next';
import { CONTACT_EMAIL } from '@constants/contact';
import type { Issue } from '../profile-form.types';
import styles from './FormMessage.module.css';

// The address is a constant (D-74); a text writes it as <mail>{{email}}</mail>.
const MAIL_LINK = <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" />;

/** A plain sentence under a field, or above the button: no icon, no exclamation mark (DESIGN.md, Inputs). */
export function FormMessage({ id, issue }: { id: string; issue: Issue }) {
  return (
    <p id={id} className={styles.message} role="alert">
      <Trans i18nKey={issue.key} values={issue.values} components={{ mail: MAIL_LINK }} />
    </p>
  );
}
