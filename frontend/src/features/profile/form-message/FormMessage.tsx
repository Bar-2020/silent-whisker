import { CONTACT_EMAIL } from '@constants/contact';
import styles from './FormMessage.module.css';

/**
 * A plain sentence under a field, or above the buttons: no icon, no exclamation mark (DESIGN.md,
 * Inputs). The contact address (D-74), when the text carries it, becomes a mail link.
 */
export function FormMessage({ id, message }: { id: string; message: string }) {
  const [beforeAddress, afterAddress] = message.split(CONTACT_EMAIL);

  return (
    <p id={id} className={styles.message} role="alert">
      {beforeAddress}
      {message.includes(CONTACT_EMAIL) && (
        <>
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr">
            {CONTACT_EMAIL}
          </a>
          {afterAddress}
        </>
      )}
    </p>
  );
}
