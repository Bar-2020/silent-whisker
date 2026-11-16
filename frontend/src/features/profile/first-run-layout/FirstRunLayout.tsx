import type { ReactNode } from 'react';
import { FirstRunFootbar } from '../first-run-footbar/FirstRunFootbar';
import styles from './FirstRunLayout.module.css';

/** A first-run screen: its content in a column, and the buttons pinned below it (design/briefs/01-first-run.md). */
export function FirstRunLayout({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <div className={styles.step}>
      <div className={styles.body}>{children}</div>
      <FirstRunFootbar>{actions}</FirstRunFootbar>
    </div>
  );
}
