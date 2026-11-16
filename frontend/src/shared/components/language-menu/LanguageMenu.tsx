import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@shared/components/icon/GlobeIcon';
import { LanguageDialog } from '@shared/components/language-dialog/LanguageDialog';
import styles from './LanguageMenu.module.css';

/** A globe button that opens the four languages (DESIGN.md, Language menu). */
export function LanguageMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

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
        <LanguageDialog
          onClose={() => {
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}
