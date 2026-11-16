import { useTranslation } from 'react-i18next';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { CheckIcon } from '@shared/components/icon/CheckIcon';
import { InfoIcon } from '@shared/components/icon/InfoIcon';
import { LocateIcon } from '@shared/components/icon/LocateIcon';
import { InfoNotice } from '../info-notice/InfoNotice';
import { InfoNoticeTone } from '../info-notice/InfoNotice.types';
import { LocationGuide } from '../location-guide/LocationGuide';
import { ProfileSubpageHeader } from '../profile-subpage-header/ProfileSubpageHeader';
import { hasGeolocation, useLocationPermission } from '../use-location-permission';
import { LocationPermission } from '../use-location-permission.types';
import styles from './LocationHelpPage.module.css';

/**
 * Where the member sees whether location is on and how to turn it back on, per browser
 * (`/profile/location`). A refusal can only be undone in the browser's own settings (D-31, D-111).
 */
export function LocationHelpPage() {
  const { t } = useTranslation();
  const { permission, isRequesting, requestPermission } = useLocationPermission();
  // Without the Permissions API the browser cannot say, so asking is the only way to find out.
  const canAsk =
    hasGeolocation() &&
    (permission === LocationPermission.Prompt || permission === LocationPermission.Unsupported);
  // Wait for the answer first, or the steps would show and then vanish for a member who was never asked.
  const isAskedBefore = permission !== undefined && permission !== LocationPermission.Prompt;

  return (
    <div className={styles.page}>
      <title>{`${t('profile.location.title')} | ${t('app.name')}`}</title>
      <ProfileSubpageHeader title={t('profile.location.title')} />
      {permission === LocationPermission.Granted && (
        <InfoNotice
          icon={<CheckIcon />}
          tone={InfoNoticeTone.Ok}
          title={t('profile.location.grantedTitle')}
          text={t('profile.location.grantedText')}
        />
      )}
      {permission === LocationPermission.Denied && (
        <InfoNotice
          icon={<LocateIcon />}
          tone={InfoNoticeTone.Bad}
          title={t('profile.location.deniedTitle')}
          text={t('profile.location.deniedText')}
        />
      )}
      {permission === LocationPermission.Prompt && (
        <InfoNotice
          icon={<LocateIcon />}
          tone={InfoNoticeTone.Neutral}
          title={t('profile.location.notAskedTitle')}
          text={t('profile.location.notAskedText')}
        />
      )}
      {canAsk && (
        <FormButton
          type="button"
          variant={FormButtonVariant.Primary}
          pending={isRequesting}
          disabled={isRequesting}
          onClick={() => {
            void requestPermission();
          }}
        >
          {t('firstrun.location.allow')}
        </FormButton>
      )}
      {isAskedBefore && (
        <>
          <InfoNotice
            icon={<InfoIcon />}
            tone={InfoNoticeTone.Neutral}
            title={t('firstrun.location.always.title')}
            text={t('firstrun.location.always.text')}
          />
          <section className={styles.steps}>
            <h2>{t('profile.location.stepsTitle')}</h2>
            <LocationGuide />
          </section>
        </>
      )}
      <p className={styles.without}>{t('profile.location.without')}</p>
    </div>
  );
}
