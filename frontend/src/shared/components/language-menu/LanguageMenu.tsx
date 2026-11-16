import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@constants/languages';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { GlobeIcon } from '@shared/components/icon/GlobeIcon';
import { ModalDialog } from '@shared/components/modal-dialog/ModalDialog';
import styles from './LanguageMenu.module.css';

/** A globe button that opens the four languages, each in its own script (DESIGN.md, Language menu). */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('lang.choose')}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <GlobeIcon />
      </button>
      {isOpen && (
        <ModalDialog title={t('lang.choose')} onClose={close}>
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
                    close();
                  }}
                >
                  {label}
                  {i18n.language === code && <CheckIcon />}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.close} onClick={close}>
            {t('common.close')}
          </button>
        </ModalDialog>
      )}
    </>
  );
}
