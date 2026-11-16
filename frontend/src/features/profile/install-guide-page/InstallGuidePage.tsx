import { useTranslation } from 'react-i18next';
import { InstallGuide } from '../install-guide/InstallGuide';
import { ProfileSubpageHeader } from '../profile-subpage-header/ProfileSubpageHeader';
import styles from './InstallGuidePage.module.css';

/** The install guide again, from Profile (`/profile/install`), for a member who skipped it or got a new phone. */
export function InstallGuidePage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <title>{`${t('profile.install.title')} | ${t('app.name')}`}</title>
      <ProfileSubpageHeader title={t('profile.install.title')} />
      <p className={styles.lead}>{t('profile.install.lead')}</p>
      <InstallGuide />
      <p className={styles.note}>{t('profile.install.note')}</p>
    </div>
  );
}
