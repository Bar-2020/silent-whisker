import { useTranslation } from 'react-i18next';
import type { BrowserGuideEntry } from './BrowserGuides.types';
import styles from './BrowserGuides.module.css';

/** A how-to with one collapsible part per browser; the part of `openBrowser` starts open, none when it is null. */
export function BrowserGuides({
  guides,
  openBrowser,
}: {
  guides: readonly BrowserGuideEntry[];
  openBrowser: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.guide}>
      {guides.map(({ browser, titleKey, stepKeys }) => (
        <details key={browser} className={styles.details} open={browser === openBrowser}>
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
