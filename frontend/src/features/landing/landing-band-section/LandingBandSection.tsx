import type { ReactNode } from 'react';
import styles from './LandingBandSection.module.css';

export function LandingBandSection({
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
