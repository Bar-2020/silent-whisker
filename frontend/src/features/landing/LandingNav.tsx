import { useTranslation } from 'react-i18next';
import { LanguageMenu } from '@shared/components/language-menu/LanguageMenu';
import { Brandmark } from './Brandmark';
import { SECTION_ID } from './sections';
import { SignInButton } from './SignInButton';
import styles from './LandingNav.module.css';

/** A floating glass pill over the hero band (DESIGN.md, Landing). */
export function LandingNav() {
  const { t } = useTranslation();

  return (
    <header className={styles.nav}>
      <div className={styles.brand}>
        <Brandmark />
      </div>
      <nav className={styles.links} aria-label={t('landing.nav.label')}>
        <a href={`#${SECTION_ID.how}`}>{t('landing.nav.how')}</a>
        <a href={`#${SECTION_ID.privacy}`}>{t('landing.nav.privacy')}</a>
        <a href={`#${SECTION_ID.support}`}>{t('landing.nav.support')}</a>
      </nav>
      <div className={styles.end}>
        <LanguageMenu />
        <SignInButton size="small" onBand />
      </div>
    </header>
  );
}
