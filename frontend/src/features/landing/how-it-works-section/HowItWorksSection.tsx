import { useTranslation } from 'react-i18next';
import { BowlIcon } from '@shared/components/icon/BowlIcon';
import { LandingBandSection } from '../landing-band-section/LandingBandSection';
import { SECTION_ID } from '../sections';
import { HowItWorksStep } from '../how-it-works-step/HowItWorksStep';
import { SpotMarker } from '../spot-marker/SpotMarker';
import styles from './HowItWorksSection.module.css';

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <LandingBandSection headingId={SECTION_ID.how} tone="steps">
      <div className={styles.head}>
        <h2 id={SECTION_ID.how}>{t('landing.how.title')}</h2>
        <p className={styles.lead}>{t('landing.how.lead')}</p>
      </div>
      <ol className={styles.steps}>
        <HowItWorksStep level="red" title={t('landing.step1.title')} text={t('landing.step1.text')}>
          <SpotMarker />
        </HowItWorksStep>
        <HowItWorksStep title={t('landing.step2.title')} text={t('landing.step2.text')}>
          <BowlIcon />
        </HowItWorksStep>
        <HowItWorksStep
          level="green"
          isLast
          title={t('landing.step3.title')}
          text={t('landing.step3.text')}
        >
          <SpotMarker />
        </HowItWorksStep>
      </ol>
    </LandingBandSection>
  );
}
