import type { ReactNode } from 'react';
import styles from './LandingSection.module.css';

export function LandingSection({
  headingId,
  tone,
  children,
}: {
  headingId: string;
  tone?: 'steps' | 'trust' | 'support';
  children: ReactNode;
}) {
  return (
    <section className={styles.section} data-tone={tone} aria-labelledby={headingId}>
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
