import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BackIcon } from '@shared/components/icon/BackIcon';
import { InstallGuide } from '../install-guide/InstallGuide';
import styles from './InstallGuidePage.module.css';
import { PROFILE_PATH } from '@constants/routes';

/** The install guide again, from Profile (`/profile/install`), for a member who skipped it or got a new phone. */
export function InstallGuidePage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <title>{`${t('profile.install.title')} | ${t('app.name')}`}</title>
      <header className={styles.header}>
        <Link to={PROFILE_PATH} className={styles.back} aria-label={t('common.back')}>
          <BackIcon />
        </Link>
        <h1>{t('profile.install.title')}</h1>
      </header>
      <p className={styles.lead}>{t('profile.install.lead')}</p>
      <InstallGuide />
      <p className={styles.note}>{t('profile.install.note')}</p>
    </div>
  );
}
