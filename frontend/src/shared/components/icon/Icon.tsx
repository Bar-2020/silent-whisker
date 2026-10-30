import type { ReactNode } from 'react';
import styles from './Icon.module.css';

/** The frame of every icon: 24px grid, 2px stroke, round ends (design/mocks/icons.js). Each icon is its own file. */
export function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
