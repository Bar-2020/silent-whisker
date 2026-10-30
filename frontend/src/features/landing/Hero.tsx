import { useTranslation } from 'react-i18next';
import { SignInButton } from './SignInButton';
import styles from './Hero.module.css';

/** The pitch alone, on the slate band that runs up under the navigation bar. */
export function Hero() {
  const { t } = useTranslation();

  return (
    <div className={styles.band}>
      <section className={styles.hero} aria-labelledby="landing-h1">
        <h1 id="landing-h1">{t('landing.h1')}</h1>
        <p className={styles.lead}>{t('landing.lead')}</p>
        <SignInButton size="large" onBand />
      </section>
    </div>
  );
}
