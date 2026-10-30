import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../../../../shared/constants/languages';
import { Icon } from '../icon/Icon';
import styles from './LanguageMenu.module.css';

/** A globe button that opens the four languages, each in its own script (DESIGN.md, Language menu). */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={t('lang.choose')}
        onClick={() => dialog.current?.showModal()}
      >
        <Icon name="globe" />
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          // Only the scrim is the dialog itself: its content sits in the inner div.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className={styles.content}>
          <h2 id={titleId}>{t('lang.choose')}</h2>
          <ul>
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
                    dialog.current?.close();
                  }}
                >
                  {label}
                  {i18n.language === code && <Icon name="check" />}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
            {t('common.close')}
          </button>
        </div>
      </dialog>
    </>
  );
}
