import { useTranslation } from 'react-i18next';
import { BowlIcon } from '@shared/components/icon/BowlIcon';
import { LandingSection } from './LandingSection';
import { SECTION_ID } from './sections';
import { Step } from './Step';
import { StepPin } from './StepPin';
import styles from './StepsSection.module.css';

export function StepsSection() {
  const { t } = useTranslation();

  return (
    <LandingSection headingId={SECTION_ID.how} tone="steps">
      <div className={styles.head}>
        <h2 id={SECTION_ID.how}>{t('landing.how.title')}</h2>
        <p className={styles.lead}>{t('landing.how.lead')}</p>
      </div>
      <ol className={styles.steps}>
        <Step level="red" title={t('landing.step1.title')} text={t('landing.step1.text')}>
          <StepPin />
        </Step>
        <Step title={t('landing.step2.title')} text={t('landing.step2.text')}>
          <BowlIcon />
        </Step>
        <Step level="green" isLast title={t('landing.step3.title')} text={t('landing.step3.text')}>
          <StepPin />
        </Step>
      </ol>
    </LandingSection>
  );
}
