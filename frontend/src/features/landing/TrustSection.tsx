import { useTranslation } from 'react-i18next';
import { LocateIcon } from '@shared/components/icon/LocateIcon';
import { LockIcon } from '@shared/components/icon/LockIcon';
import { PinIcon } from '@shared/components/icon/PinIcon';
import { ShieldIcon } from '@shared/components/icon/ShieldIcon';
import { LandingSection } from './LandingSection';
import { SECTION_ID } from './sections';
import styles from './TrustSection.module.css';

/** What the app promises about privacy, before anyone signs in. */
export function TrustSection() {
  const { t } = useTranslation();

  return (
    <LandingSection headingId={SECTION_ID.privacy} tone="trust">
      <h2 id={SECTION_ID.privacy}>{t('landing.privacy.title')}</h2>
      <ul className={styles.promise}>
        <li>
          <LocateIcon />
          <span>{t('landing.privacy.1')}</span>
        </li>
        <li>
          <PinIcon />
          <span>{t('landing.privacy.2')}</span>
        </li>
        <li>
          <ShieldIcon />
          <span>{t('landing.privacy.3')}</span>
        </li>
        <li>
          <LockIcon />
          <span>{t('landing.privacy.4')}</span>
        </li>
      </ul>
    </LandingSection>
  );
}
