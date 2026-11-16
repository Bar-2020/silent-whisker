import type { FormButtonProps } from './FormButton.types';
import styles from './FormButton.module.css';

/**
 * A button of a form or a screen. While `pending` it keeps its size and shows only a spinner; the
 * label stays in the page, invisible, so a screen reader still hears it (DESIGN.md, Buttons).
 */
export function FormButton({
  type,
  variant,
  pending,
  disabled,
  onClick,
  children,
}: FormButtonProps) {
  return (
    <button
      type={type}
      className={styles.button}
      data-variant={variant}
      aria-busy={pending}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={styles.label}>{children}</span>
      {pending && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}
