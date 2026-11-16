import type { InfoNoticeProps } from './InfoNotice.types';
import styles from './InfoNotice.module.css';

/** A tinted block with an icon, an optional bold title and one sentence (DESIGN.md, Notices and toasts). */
export function InfoNotice({ icon, tone, title, text }: InfoNoticeProps) {
  return (
    <div className={styles.notice} data-tone={tone}>
      <span className={styles.icon}>{icon}</span>
      <p className={styles.text}>
        {title && <strong className={styles.title}>{title}</strong>}
        <span>{text}</span>
      </p>
    </div>
  );
}
