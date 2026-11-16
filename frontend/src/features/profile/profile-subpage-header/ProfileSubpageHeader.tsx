import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PROFILE_PATH } from '@constants/routes';
import { BackIcon } from '@shared/components/icon/BackIcon';
import styles from './ProfileSubpageHeader.module.css';

/** The top of a page that opens from Profile: a back arrow to Profile and the page's title. */
export function ProfileSubpageHeader({ title }: { title: string }) {
  const { t } = useTranslation();

  return (
    <header className={styles.header}>
      <Link to={PROFILE_PATH} className={styles.back} aria-label={t('common.back')}>
        <BackIcon />
      </Link>
      <h1>{title}</h1>
    </header>
  );
}
