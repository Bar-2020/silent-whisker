import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LANGUAGES } from '@constants/languages';
import { INSTALL_GUIDE_PATH, LOCATION_HELP_PATH } from '@constants/routes';
import { signOut } from '@shared/auth/session';
import { GlobeIcon } from '@shared/components/icon/GlobeIcon';
import { LocateIcon } from '@shared/components/icon/LocateIcon';
import { PhoneIcon } from '@shared/components/icon/PhoneIcon';
import { SignOutIcon } from '@shared/components/icon/SignOutIcon';
import { TrashIcon } from '@shared/components/icon/TrashIcon';
import { LanguageDialog } from '@shared/components/language-dialog/LanguageDialog';
import { ProfileRow } from '../profile-row/ProfileRow';
import { ProfileRowTone, type ProfileRowChip } from '../profile-row/ProfileRow.types';
import { ProfileSection } from '../profile-section/ProfileSection';
import { useLocationPermission } from '../use-location-permission';
import { LocationPermission } from '../use-location-permission.types';

/** The settings list of Profile: language, the pages that explain location and installing, sign out, delete account. */
export function ProfileSettings({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { permission } = useLocationPermission();
  const [isChoosingLanguage, setIsChoosingLanguage] = useState(false);
  const current = LANGUAGES.find(({ code }) => code === i18n.language);
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
    <ProfileSection title={t('profile.settings.title')}>
      <ProfileRow
        icon={<GlobeIcon />}
        title={t('profile.settings.language')}
        hint={
          current && (
            <span lang={current.code} dir={current.dir}>
              {current.label}
            </span>
          )
        }
        opensPage
        tone={ProfileRowTone.Normal}
        onClick={() => {
          setIsChoosingLanguage(true);
        }}
      />
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
      {isChoosingLanguage && (
        <LanguageDialog
          onClose={() => {
            setIsChoosingLanguage(false);
          }}
        />
      )}
    </ProfileSection>
  );
}
