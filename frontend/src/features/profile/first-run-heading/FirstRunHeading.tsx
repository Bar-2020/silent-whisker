import type { ReactNode } from 'react';
import styles from './FirstRunHeading.module.css';

/** The top of a first-run screen: a round icon, the title and one line of why (design/briefs/01-first-run.md). */
export function FirstRunHeading({
  icon,
  title,
  lead,
}: {
  icon: ReactNode;
  title: string;
  lead: string;
}) {
  return (
    <>
      <span className={styles.illustration}>{icon}</span>
      <div className={styles.heading}>
        <h1>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
    </>
  );
}
