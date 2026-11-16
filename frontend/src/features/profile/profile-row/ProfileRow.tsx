import type { ProfileRowProps } from './ProfileRow.types';
import styles from './ProfileRow.module.css';

/** One row of Profile's settings list: an icon and a title, pressed to act (design/mocks/profile.html). */
export function ProfileRow({ icon, title, tone, onClick }: ProfileRowProps) {
  return (
    <button type="button" className={styles.row} data-tone={tone} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.title}>{title}</span>
    </button>
  );
}
