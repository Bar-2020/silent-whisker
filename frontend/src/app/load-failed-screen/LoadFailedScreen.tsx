import { LANGUAGES } from '@constants/languages';
import { RetryIcon } from '@shared/components/icon/RetryIcon';
import { readStoredLanguage } from '@shared/i18n/i18n';
import styles from './LoadFailedScreen.module.css';

/** The word comes from the constants, in the language the member chose: the language file failed (D-102). */
export function LoadFailedScreen() {
  const stored = readStoredLanguage();
  const language = LANGUAGES.find((entry) => entry.code === stored) ?? LANGUAGES[0];

  return (
    <div className={styles.screen} lang={language.code} dir={language.dir}>
      <button
        type="button"
        className={styles.retry}
        onClick={() => {
          window.location.reload();
        }}
      >
        <RetryIcon />
        {language.retry}
      </button>
    </div>
  );
}
