import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CONTACT_EMAIL, SOURCE_CODE_URL } from '@constants/contact';
import { HeartIcon } from '@shared/components/icon/HeartIcon';
import { Brandmark } from './Brandmark';
import { SECTION_ID } from './sections';
import styles from './LandingFooter.module.css';

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Brandmark />
          <p>{t('landing.footer.tagline')}</p>
        </div>
        <nav aria-label={t('landing.footer.label')}>
          <ul className={styles.links}>
            <li>
              <a href={`#${SECTION_ID.how}`}>{t('landing.nav.how')}</a>
            </li>
            <li>
              <Link to="/terms">{t('legal.terms.title')}</Link>
            </li>
            <li>
              <a href={`#${SECTION_ID.privacy}`}>{t('landing.nav.privacy')}</a>
            </li>
            <li>
              <Link to="/privacy">{t('legal.privacy.title')}</Link>
            </li>
            <li>
              <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer">
                {t('landing.source')}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>{t('common.contact')}</a>
            </li>
          </ul>
        </nav>
        <div className={styles.base}>
          <p>{t('landing.footer')}</p>
          <p className={styles.made}>
            <Trans i18nKey="landing.madeBy" components={{ heart: <HeartIcon /> }} />
          </p>
        </div>
      </div>
    </footer>
  );
}
