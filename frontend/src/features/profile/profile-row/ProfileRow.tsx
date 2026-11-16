import { Link } from 'react-router';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { ChevronIcon } from '@shared/components/icon/ChevronIcon';
import { ExternalIcon } from '@shared/components/icon/ExternalIcon';
import { RestrictIcon } from '@shared/components/icon/RestrictIcon';
import type { ProfileRowProps } from './ProfileRow.types';
import styles from './ProfileRow.module.css';

/** One row of a Profile list: an icon and a title, pressed to act or to follow a link (design/mocks/profile.html). */
export function ProfileRow(props: ProfileRowProps) {
  const { icon, title, hint, chip, opensPage, tone } = props;
  const content = (
    <>
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
      {props.href !== undefined && (
        <span className={styles.external}>
          <ExternalIcon />
        </span>
      )}
    </>
  );

  if (props.href !== undefined) {
    return (
      <a
        className={styles.row}
        data-tone={tone}
        href={props.href}
        {...(props.opensNewTab && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
      >
        {content}
      </a>
    );
  }
  if (props.to !== undefined) {
    return (
      <Link className={styles.row} data-tone={tone} to={props.to}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.row} data-tone={tone} onClick={props.onClick}>
      {content}
    </button>
  );
}
