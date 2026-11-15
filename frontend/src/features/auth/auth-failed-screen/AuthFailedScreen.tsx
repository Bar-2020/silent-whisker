import { useTranslation } from 'react-i18next';
import type { AuthFailedProps } from './AuthFailedScreen.types';
import styles from './AuthFailedScreen.module.css';
import { useRetryWait } from './use-retry-wait';

/** A plain stop with one button; for a rate limit the button stays off for `waitSeconds`. */
export function AuthFailedScreen(props: AuthFailedProps) {
  const { t } = useTranslation();
  const waitSeconds = props.kind === 'rateLimited' ? props.waitSeconds : undefined;
  const waiting = useRetryWait(waitSeconds);
  const screenText = {
    signIn: { title: t('states.signIn.title'), text: t('states.signIn.text') },
    connection: { title: t('states.error.title'), text: t('states.loadFailed.text') },
    rateLimited: {
      title: t('common.rateLimit.title'),
      text: t('common.rateLimit.text', { n: waitSeconds }),
    },
  }[props.kind];

  return (
    <section className={styles.screen}>
      <h1>{screenText.title}</h1>
      <p className={styles.text}>{screenText.text}</p>
      <button type="button" className={styles.retry} disabled={waiting} onClick={props.onRetry}>
        {t('common.retry')}
      </button>
    </section>
  );
}
