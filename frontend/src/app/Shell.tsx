import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { Icon } from '../shared/icons/Icon';
import { LanguageMenu } from '../shared/language-menu/LanguageMenu';
import styles from './Shell.module.css';

export function Shell() {
  const { t } = useTranslation();

  return (
    <>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand} aria-label={t('nav.home')}>
          <Icon name="cat" />
        </Link>
        <LanguageMenu />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
