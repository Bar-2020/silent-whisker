import { useTranslation } from 'react-i18next';
import { detectInstallBrowser } from './detect-install-browser';
import { INSTALL_GUIDES } from './install-guides';
import styles from './InstallGuide.module.css';

/** How to put the app on the home screen, one part per browser; the part for this browser is open (D-01, D-110). */
export function InstallGuide() {
  const { t } = useTranslation();
  const detected = detectInstallBrowser(navigator.userAgent, navigator.maxTouchPoints);

  return (
    <div className={styles.guide}>
      {INSTALL_GUIDES.map(({ browser, titleKey, stepKeys }) => (
        <details key={browser} className={styles.details} open={browser === detected}>
          <summary className={styles.summary}>{t(titleKey)}</summary>
          <ol className={styles.steps}>
            {stepKeys.map((stepKey) => (
              <li key={stepKey} className={styles.step}>
                {t(stepKey)}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
