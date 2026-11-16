import { useTranslation } from 'react-i18next';
import styles from './HomePage.module.css';

/**
 * Where a signed-in member lands and what the cat icon leads to (D-114). Blank until the map takes
 * its place in Phase 3: the heading is there for screen readers and the tab title only.
 */
export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <title>{`${t('home.title')} | ${t('app.name')}`}</title>
      <h1 className={styles.hiddenHeading}>{t('home.title')}</h1>
    </>
  );
}
