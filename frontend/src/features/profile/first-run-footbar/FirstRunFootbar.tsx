import type { ReactNode } from 'react';
import styles from './FirstRunFootbar.module.css';

/** The buttons of a first-run screen, on a flat white bar at the bottom, above the safe area (DESIGN.md). */
export function FirstRunFootbar({ children }: { children: ReactNode }) {
  return <div className={styles.footbar}>{children}</div>;
}
