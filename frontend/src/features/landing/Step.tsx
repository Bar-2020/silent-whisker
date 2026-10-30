import type { ReactNode } from 'react';
import styles from './Step.module.css';

/** One numbered step; its picture takes the colour of the state it shows. */
export function Step({
  level,
  isLast = false,
  title,
  text,
  children,
}: {
  level?: 'red' | 'green';
  isLast?: boolean;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <li className={styles.step} data-level={level}>
      {!isLast && <span className={styles.line} aria-hidden="true" />}
      <span className={styles.number} aria-hidden="true" />
      <span className={styles.visual}>{children}</span>
      <div className={styles.text}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{text}</p>
      </div>
    </li>
  );
}
