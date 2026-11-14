import { useTranslation } from 'react-i18next';
import { signOut } from '@shared/auth/session';
import styles from './ProfilePage.module.css';

/** F4 builds the page; until then it holds the one thing a signed-in member must be able to do. */
export function ProfilePage() {
  const { t } = useTranslation();

  return (
    <button type="button" className={styles.signOut} onClick={() => void signOut()}>
      {t('profile.signOut')}
    </button>
  );
}
