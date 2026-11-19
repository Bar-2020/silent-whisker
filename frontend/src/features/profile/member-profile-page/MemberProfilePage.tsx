import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';
import { EditIcon } from '@shared/components/icon/EditIcon';
import { useCities } from '../cities/use-cities';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { DeleteAccountDialog } from '../delete-account-dialog/DeleteAccountDialog';
import { EditProfileForm } from '../edit-profile-form/EditProfileForm';
import { MemberAvatar } from '../member-avatar/MemberAvatar';
import { AvatarSize } from '../member-avatar/MemberAvatar.types';
import { profileContextSchema } from '../profile-context.schema';
import { ProfileSettings } from '../profile-settings/ProfileSettings';
import { ProfileSupport } from '../profile-support/ProfileSupport';
import styles from './MemberProfilePage.module.css';
import { MEMBER_STATUS } from '@constants/member-status';

/** Who the member is to everyone else, a way to change it, sign out, delete the account, and the support links. Stats and the admin group come with their own backend. */
export function MemberProfilePage() {
  const { t } = useTranslation();
  const { data: cityNames } = useCities();
  const { profile, hasGooglePhoto } = profileContextSchema.parse(useOutletContext());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isBanned = profile.status === MEMBER_STATUS.banned;
  const memberFullName = profile.display_name ?? '';
  const memberCityName = cityNames?.find(({ id }) => id === profile.city_id)?.name ?? '';

  return (
    <div className={styles.page}>
      <title>{`${t('profile.heading')} | ${t('app.name')}`}</title>
      <header className={styles.header}>
        <h1>{t('profile.heading')}</h1>
        {!isBanned && !isEditingProfile && (
          <button
            type="button"
            className={styles.edit}
            aria-label={t('profile.edit.title')}
            onClick={() => {
              setIsEditingProfile(true);
            }}
          >
            <EditIcon />
          </button>
        )}
      </header>
      {isBanned && <BannedAccountNotice />}
      {isEditingProfile ? (
        <EditProfileForm
          profile={profile}
          hasGooglePhoto={hasGooglePhoto}
          onClose={() => {
            setIsEditingProfile(false);
          }}
        />
      ) : (
        <div className={styles.identity}>
          <MemberAvatar
            fullName={memberFullName}
            photoUrl={profile.avatar_url}
            size={AvatarSize.Large}
          />
          <div className={styles.text}>
            <h2>
              <bdi>{memberFullName}</bdi>
            </h2>
            <p className={styles.city}>
              <bdi>{memberCityName}</bdi>
            </p>
          </div>
        </div>
      )}
      <ProfileSettings
        onDeleteAccount={() => {
          setIsDeleteDialogOpen(true);
        }}
      />
      <ProfileSupport />
      {isDeleteDialogOpen && (
        <DeleteAccountDialog
          onClose={() => {
            setIsDeleteDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
