import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className={styles.page}>
      <h1>{t('states.notFound.title')}</h1>
      <p className={styles.text}>{t('states.notFound.text')}</p>
      <Link to="/">{t('states.notFound.back')}</Link>
    </section>
  );
}
