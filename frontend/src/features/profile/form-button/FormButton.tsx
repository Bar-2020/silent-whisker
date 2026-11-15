import type { ReactNode } from 'react';
import styles from './FormButton.module.css';

/**
 * A button of the profile forms. While `pending` it keeps its size and shows only a spinner; the
 * label stays in the page, invisible, so a screen reader still hears it (DESIGN.md, Buttons).
 */
export function FormButton({
  type,
  variant,
  pending,
  onClick,
  children,
}: {
  type: 'submit' | 'button';
  variant: 'primary' | 'secondary' | 'quiet';
  pending: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={styles.button}
      data-variant={variant}
      aria-busy={pending}
      onClick={onClick}
    >
      <span className={styles.label}>{children}</span>
      {pending && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}
