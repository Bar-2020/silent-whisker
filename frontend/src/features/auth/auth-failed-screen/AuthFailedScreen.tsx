import { useTranslation } from 'react-i18next';
import styles from './AuthFailedScreen.module.css';

/** A plain stop with one button: sign-in did not finish, or the account could not be loaded. */
export function AuthFailedScreen({
  kind,
  onRetry,
}: {
  kind: 'signIn' | 'connection';
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className={styles.screen}>
      <h1>{kind === 'signIn' ? t('states.signIn.title') : t('states.error.title')}</h1>
      <p className={styles.text}>
        {kind === 'signIn' ? t('states.signIn.text') : t('states.loadFailed.text')}
      </p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        {t('common.retry')}
      </button>
    </section>
  );
}
