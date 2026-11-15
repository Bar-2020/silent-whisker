import { useTranslation } from 'react-i18next';
import type { AuthFailedProps } from './AuthFailedScreen.types';
import styles from './AuthFailedScreen.module.css';
import { useRetryWait } from './use-retry-wait';

const TEXT_KEYS = {
  signIn: { title: 'states.signIn.title', text: 'states.signIn.text' },
  connection: { title: 'states.error.title', text: 'states.loadFailed.text' },
  rateLimited: { title: 'common.rateLimit.title', text: 'common.rateLimit.text' },
} as const;

/** A plain stop with one button; for a rate limit the button stays off for `waitSeconds`. */
export function AuthFailedScreen(props: AuthFailedProps) {
  const { t } = useTranslation();
  const waitSeconds = props.kind === 'rateLimited' ? props.waitSeconds : undefined;
  const waiting = useRetryWait(waitSeconds);
  const keys = TEXT_KEYS[props.kind];

  return (
    <section className={styles.screen} role="alert">
      <h1>{t(keys.title)}</h1>
      <p className={styles.text}>{t(keys.text, { n: waitSeconds })}</p>
      <button type="button" className={styles.retry} disabled={waiting} onClick={props.onRetry}>
        {t('common.retry')}
      </button>
    </section>
  );
}
