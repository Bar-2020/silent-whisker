import { useTranslation } from 'react-i18next';
import { RestrictIcon } from '@shared/components/icon/RestrictIcon';
import styles from './BannedAccountNotice.module.css';

/** Shown for as long as the member is banned: reading works, every write is refused (R-08, D-72). */
export function BannedAccountNotice() {
  const { t } = useTranslation();

  return (
    <div className={styles.notice}>
      <RestrictIcon />
      <p>
        <strong>{t('common.banned.title')}</strong>
        <span>{t('common.banned.text')}</span>
      </p>
    </div>
  );
}
