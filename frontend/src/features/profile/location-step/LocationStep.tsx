import { useTranslation } from 'react-i18next';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { CatIcon } from '@shared/components/icon/CatIcon';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { InfoIcon } from '@shared/components/icon/InfoIcon';
import { LocateIcon } from '@shared/components/icon/LocateIcon';
import { LockIcon } from '@shared/components/icon/LockIcon';
import { PinIcon } from '@shared/components/icon/PinIcon';
import { FirstRunHeading } from '../first-run-heading/FirstRunHeading';
import { FirstRunLayout } from '../first-run-layout/FirstRunLayout';
import { InfoNotice } from '../info-notice/InfoNotice';
import { InfoNoticeTone } from '../info-notice/InfoNotice.types';
import { useLocationPermission } from '../use-location-permission';
import styles from './LocationStep.module.css';

/**
 * The screen after the install step: why the browser is about to ask for the phone's location,
 * then one button that starts the prompt and one that goes on without it. Whatever the answer,
 * `onDone` follows: nothing depends on the grant (D-31, D-111).
 */
export function LocationStep({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { isRequesting, requestPermission } = useLocationPermission();

  return (
    <FirstRunLayout
      actions={
        <>
          <FormButton
            type="button"
            variant={FormButtonVariant.Primary}
            pending={isRequesting}
            disabled={isRequesting}
            onClick={() => {
              void requestPermission().then(onDone);
            }}
          >
            {isRequesting ? t('firstrun.location.pending') : t('firstrun.location.allow')}
          </FormButton>
          <FormButton
            type="button"
            variant={FormButtonVariant.Quiet}
            pending={false}
            disabled={isRequesting}
            onClick={onDone}
          >
            {t('firstrun.location.skip')}
          </FormButton>
        </>
      }
    >
      <FirstRunHeading
        icon={<LocateIcon />}
        title={t('firstrun.location.h1')}
        lead={t('firstrun.location.lead')}
      />
      <ul className={styles.why}>
        <li>
          <CheckIcon />
          <span>{t('firstrun.location.why1')}</span>
        </li>
        <li>
          <CatIcon />
          <span>{t('firstrun.location.why2')}</span>
        </li>
        <li>
          <PinIcon />
          <span>{t('firstrun.location.why3')}</span>
        </li>
      </ul>
      <InfoNotice
        icon={<InfoIcon />}
        tone={InfoNoticeTone.Neutral}
        title={t('firstrun.location.always.title')}
        text={t('firstrun.location.always.text')}
      />
      <InfoNotice
        icon={<LockIcon />}
        tone={InfoNoticeTone.Neutral}
        text={t('firstrun.location.privacy')}
      />
      <p className={styles.optional}>{t('firstrun.location.optional')}</p>
      {isRequesting && (
        <div role="status">
          <InfoNotice
            icon={<LocateIcon />}
            tone={InfoNoticeTone.Neutral}
            text={t('firstrun.location.waiting')}
          />
        </div>
      )}
    </FirstRunLayout>
  );
}
