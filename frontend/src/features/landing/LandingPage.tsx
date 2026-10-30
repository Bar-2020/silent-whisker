import { useTranslation } from 'react-i18next';
import { SiteFooter } from '@shared/components/site-footer/SiteFooter';
import { SECTION_ID } from './sections';
import { Hero } from './Hero';
import { LandingNav } from './LandingNav';
import { StepsSection } from './StepsSection';
import { SupportSection } from './SupportSection';
import { TrustSection } from './TrustSection';
import styles from './LandingPage.module.css';

/** The only page open to everyone (D-39). The ad slot and the consent banner come with Phase 6. */
export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <title>{t('landing.title')}</title>
      <LandingNav />
      <main>
        <Hero />
        <StepsSection />
        <TrustSection />
        <SupportSection />
      </main>
      <SiteFooter
        anchors={
          <>
            <li>
              <a href={`#${SECTION_ID.how}`}>{t('landing.nav.how')}</a>
            </li>
            <li>
              <a href={`#${SECTION_ID.privacy}`}>{t('landing.nav.privacy')}</a>
            </li>
          </>
        }
      />
    </div>
  );
}
