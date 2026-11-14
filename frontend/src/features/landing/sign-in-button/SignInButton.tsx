import { useTranslation } from 'react-i18next';
import { AFTER_SIGN_IN_PATH } from '@constants/sign-in';
import { signIn } from '@shared/auth/session';
import styles from './SignInButton.module.css';

/** Sends the visitor straight to Google; they come back to the first page of the app (D-59). */
export function SignInButton({
  size,
  onBand = false,
}: {
  size: 'small' | 'large';
  onBand?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => void signIn(AFTER_SIGN_IN_PATH)}
      className={styles.button}
      data-size={size}
      data-on={onBand ? 'band' : undefined}
    >
      {size === 'small' ? t('landing.signInShort') : t('landing.signIn')}
    </button>
  );
}
