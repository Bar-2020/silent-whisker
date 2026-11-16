import { useId, type ReactNode } from 'react';
import styles from './ProfileSection.module.css';

/** A titled group of rows on the Profile page. */
export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <div className={styles.rows}>{children}</div>
    </section>
  );
}
