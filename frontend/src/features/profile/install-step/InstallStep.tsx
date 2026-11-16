import { useTranslation } from 'react-i18next';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { PhoneIcon } from '@shared/components/icon/PhoneIcon';
import { FirstRunFootbar } from '../first-run-footbar/FirstRunFootbar';
import { FirstRunHeading } from '../first-run-heading/FirstRunHeading';
import { InstallGuide } from '../install-guide/InstallGuide';
import styles from './InstallStep.module.css';

/**
 * The screen after the sign-up form: how to put the app on the home screen, and one Continue
 * button. Always shown, since a web page cannot know whether the app is installed (D-110).
 */
export function InstallStep({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();

  return (
    <div className={styles.step}>
      <div className={styles.body}>
        <FirstRunHeading
          icon={<PhoneIcon />}
          title={t('firstrun.install.h1')}
          lead={t('firstrun.install.lead')}
        />
        <InstallGuide />
        <p className={styles.later}>{t('firstrun.install.later')}</p>
      </div>
      <FirstRunFootbar>
        <FormButton
          type="button"
          variant={FormButtonVariant.Primary}
          pending={false}
          onClick={onContinue}
        >
          {t('common.continue')}
        </FormButton>
      </FirstRunFootbar>
    </div>
  );
}
