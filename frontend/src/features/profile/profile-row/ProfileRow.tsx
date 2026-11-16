import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { ChevronIcon } from '@shared/components/icon/ChevronIcon';
import { RestrictIcon } from '@shared/components/icon/RestrictIcon';
import type { ProfileRowProps } from './ProfileRow.types';
import styles from './ProfileRow.module.css';

/** One row of Profile's settings list: an icon and a title, pressed to act (design/mocks/profile.html). */
export function ProfileRow({ icon, title, hint, chip, opensPage, tone, onClick }: ProfileRowProps) {
  return (
    <button type="button" className={styles.row} data-tone={tone} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {chip && (
        <span className={styles.chip} data-on={chip.isOn}>
          {chip.isOn ? <CheckIcon /> : <RestrictIcon />}
          {chip.label}
        </span>
      )}
      {opensPage && (
        <span className={styles.chevron}>
          <ChevronIcon />
        </span>
      )}
    </button>
  );
}
