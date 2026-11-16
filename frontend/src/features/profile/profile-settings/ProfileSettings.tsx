import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { INSTALL_GUIDE_PATH, LOCATION_HELP_PATH } from '@constants/routes';
import { signOut } from '@shared/auth/session';
import { LocateIcon } from '@shared/components/icon/LocateIcon';
import { PhoneIcon } from '@shared/components/icon/PhoneIcon';
import { SignOutIcon } from '@shared/components/icon/SignOutIcon';
import { TrashIcon } from '@shared/components/icon/TrashIcon';
import { ProfileRow } from '../profile-row/ProfileRow';
import { ProfileRowTone, type ProfileRowChip } from '../profile-row/ProfileRow.types';
import { useLocationPermission } from '../use-location-permission';
import { LocationPermission } from '../use-location-permission.types';
import styles from './ProfileSettings.module.css';

/** The settings list of Profile: the pages that explain location and installing, sign out, delete account. */
export function ProfileSettings({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permission } = useLocationPermission();
  const titleId = useId();
  // Without the Permissions API the browser cannot say, so the row shows no chip rather than a guess.
  const locationChip: ProfileRowChip | undefined =
    permission === undefined || permission === LocationPermission.Unsupported
      ? undefined
      : {
          label:
            permission === LocationPermission.Granted
              ? t('profile.location.on')
              : t('profile.location.off'),
          isOn: permission === LocationPermission.Granted,
        };

  return (
    <section className={styles.settings} aria-labelledby={titleId}>
      <h2 id={titleId}>{t('profile.settings.title')}</h2>
      <div className={styles.rows}>
        <ProfileRow
          icon={<LocateIcon />}
          title={t('profile.settings.location')}
          chip={locationChip}
          opensPage
          tone={ProfileRowTone.Normal}
          onClick={() => {
            void navigate(LOCATION_HELP_PATH);
          }}
        />
        <ProfileRow
          icon={<PhoneIcon />}
          title={t('profile.settings.install')}
          hint={t('profile.settings.installHint')}
          opensPage
          tone={ProfileRowTone.Normal}
          onClick={() => {
            void navigate(INSTALL_GUIDE_PATH);
          }}
        />
        <ProfileRow
          icon={<SignOutIcon />}
          title={t('profile.signOut')}
          tone={ProfileRowTone.Normal}
          onClick={() => {
            void signOut();
          }}
        />
        <ProfileRow
          icon={<TrashIcon />}
          title={t('profile.delete.row')}
          tone={ProfileRowTone.Bad}
          onClick={onDeleteAccount}
        />
      </div>
    </section>
  );
}
