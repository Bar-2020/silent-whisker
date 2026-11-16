import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@constants/languages';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { ModalDialog } from '@shared/components/modal-dialog/ModalDialog';
import styles from './LanguageDialog.module.css';

/** The four languages, each in its own script, with a check on the current one (DESIGN.md, Language menu). */
export function LanguageDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();

  return (
    <ModalDialog title={t('lang.choose')} onClose={onClose}>
      <ul className={styles.options}>
        {LANGUAGES.map(({ code, dir, label }) => (
          <li key={code}>
            <button
              type="button"
              className={styles.option}
              lang={code}
              dir={dir}
              aria-current={i18n.language === code}
              onClick={() => {
                void i18n.changeLanguage(code);
                onClose();
              }}
            >
              {label}
              {i18n.language === code && <CheckIcon />}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.close} onClick={onClose}>
        {t('common.close')}
      </button>
    </ModalDialog>
  );
}
