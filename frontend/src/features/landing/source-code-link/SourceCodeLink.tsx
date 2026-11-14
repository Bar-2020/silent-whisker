import { useTranslation } from 'react-i18next';
import { SOURCE_CODE_URL } from '@constants/contact';
import { CodeIcon } from '@shared/components/icon/CodeIcon';
import styles from './SourceCodeLink.module.css';

/** The repository, opened in a new tab. */
export function SourceCodeLink() {
  const { t } = useTranslation();

  return (
    <a className={styles.link} href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer">
      <CodeIcon />
      {t('landing.source')}
    </a>
  );
}
