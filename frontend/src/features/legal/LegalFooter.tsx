import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CONTACT_EMAIL } from '@constants/contact';
import styles from './LegalFooter.module.css';

export function LegalFooter() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <nav aria-label={t('landing.footer.label')}>
        <ul className={styles.links}>
          <li>
            <Link to="/terms">{t('legal.terms.title')}</Link>
          </li>
          <li>
            <Link to="/privacy">{t('legal.privacy.title')}</Link>
          </li>
          <li>
            <a href={`mailto:${CONTACT_EMAIL}`}>{t('common.contact')}</a>
          </li>
          <li>
            <Link to="/">{t('legal.backHome')}</Link>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
