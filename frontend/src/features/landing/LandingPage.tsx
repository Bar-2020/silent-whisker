import { useTranslation } from 'react-i18next';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
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
      <LandingFooter />
    </div>
  );
}
