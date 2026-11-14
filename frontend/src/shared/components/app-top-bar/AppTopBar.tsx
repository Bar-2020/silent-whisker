import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CatIcon } from '@shared/components/icon/CatIcon';
import { LanguageMenu } from '@shared/components/language-menu/LanguageMenu';
import styles from './AppTopBar.module.css';

export function AppTopBar() {
  const { t } = useTranslation();

  return (
    <header className={styles.topbar}>
      <Link to="/" className={styles.brand} aria-label={t('nav.home')}>
        <CatIcon />
      </Link>
      <LanguageMenu />
    </header>
  );
}
