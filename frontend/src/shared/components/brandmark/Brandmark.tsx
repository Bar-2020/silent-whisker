import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CatIcon } from '@shared/components/icon/CatIcon';
import styles from './Brandmark.module.css';

/** The mark and the name, in the colour of the slate they sit on. */
export function Brandmark() {
  const { t } = useTranslation();

  return (
    <Link to="/" className={styles.brandmark}>
      <CatIcon />
      <span>{t('app.name')}</span>
    </Link>
  );
}
