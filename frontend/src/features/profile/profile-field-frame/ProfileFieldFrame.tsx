import type { ReactNode } from 'react';
import styles from './ProfileFieldFrame.module.css';

/** A question of the profile forms: its label, the control, its hint and whatever the control says under it (DESIGN.md, Inputs). */
export function ProfileFieldFrame({
  id,
  label,
  hintId,
  hint,
  below,
  children,
}: {
  id: string;
  label: string;
  hintId: string;
  hint: string;
  below?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
      {below}
    </div>
  );
}
