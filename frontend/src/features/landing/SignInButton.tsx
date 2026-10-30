import { useTranslation } from 'react-i18next';
import styles from './Button.module.css';

/** Inert until the next PR wires Google sign-in (D-59). */
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
      className={styles.button}
      data-size={size}
      data-on={onBand ? 'band' : undefined}
    >
      {size === 'small' ? t('landing.signInShort') : t('landing.signIn')}
    </button>
  );
}
