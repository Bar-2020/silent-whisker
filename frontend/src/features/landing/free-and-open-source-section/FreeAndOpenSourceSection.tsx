import { useTranslation } from 'react-i18next';
import { LandingBandSection } from '../landing-band-section/LandingBandSection';
import { SECTION_ID } from '../sections';
import { SignInButton } from '../sign-in-button/SignInButton';
import { SourceCodeLink } from '../source-code-link/SourceCodeLink';
import styles from './FreeAndOpenSourceSection.module.css';

/** The closing pitch: free and open source. The donation link joins it with Phase 6. */
export function FreeAndOpenSourceSection() {
  const { t } = useTranslation();

  return (
    <LandingBandSection headingId={SECTION_ID.support} tone="support">
      <h2 id={SECTION_ID.support}>{t('landing.free.title')}</h2>
      <p className={styles.text}>{t('landing.free.text')}</p>
      <div className={styles.actions}>
        <SignInButton size="large" />
        <SourceCodeLink />
      </div>
    </LandingBandSection>
  );
}
