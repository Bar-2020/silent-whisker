import { useTranslation } from 'react-i18next';
import { SOURCE_CODE_URL } from '@constants/contact';
import { CodeIcon } from '@shared/components/icon/CodeIcon';
import { LandingSection } from './LandingSection';
import { SECTION_ID } from './sections';
import { SignInButton } from './SignInButton';
import buttons from './Button.module.css';
import styles from './SupportSection.module.css';

/** The closing pitch: free and open source. The donation link joins it with Phase 6. */
export function SupportSection() {
  const { t } = useTranslation();

  return (
    <LandingSection headingId={SECTION_ID.support} tone="support">
      <h2 id={SECTION_ID.support}>{t('landing.free.title')}</h2>
      <p className={styles.text}>{t('landing.free.text')}</p>
      <div className={styles.actions}>
        <SignInButton size="large" />
        <a
          className={buttons.button}
          data-quiet=""
          href={SOURCE_CODE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <CodeIcon />
          {t('landing.source')}
        </a>
      </div>
    </LandingSection>
  );
}
