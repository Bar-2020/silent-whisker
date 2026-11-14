import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MS_PER_SECOND } from '@constants/cost';
import styles from './AuthFailedScreen.module.css';

/**
 * A plain stop with one button: sign-in did not finish, the account could not be loaded, or the
 * server asked to wait (`waitSeconds`, D-60), in which case the button stays off until then.
 */
export function AuthFailedScreen({
  kind,
  onRetry,
  waitSeconds,
}: {
  kind: 'signIn' | 'connection' | 'rateLimited';
  onRetry: () => void;
  waitSeconds?: number;
}) {
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState(kind === 'rateLimited');

  useEffect(() => {
    if (kind !== 'rateLimited') return;
    const timer = setTimeout(
      () => {
        setWaiting(false);
      },
      (waitSeconds ?? 0) * MS_PER_SECOND
    );
    return () => {
      clearTimeout(timer);
    };
  }, [kind, waitSeconds]);

  const copy = {
    signIn: { title: t('states.signIn.title'), text: t('states.signIn.text') },
    connection: { title: t('states.error.title'), text: t('states.loadFailed.text') },
    rateLimited: {
      title: t('common.rateLimit.title'),
      text: t('common.rateLimit.text', { n: waitSeconds }),
    },
  }[kind];

  return (
    <section className={styles.screen}>
      <h1>{copy.title}</h1>
      <p className={styles.text}>{copy.text}</p>
      <button type="button" className={styles.retry} disabled={waiting} onClick={onRetry}>
        {t('common.retry')}
      </button>
    </section>
  );
}
