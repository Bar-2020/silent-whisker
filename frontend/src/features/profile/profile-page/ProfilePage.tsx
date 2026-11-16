import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';
import { EditIcon } from '@shared/components/icon/EditIcon';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { DeleteAccountDialog } from '../delete-account-dialog/DeleteAccountDialog';
import { EditProfileForm } from '../edit-profile-form/EditProfileForm';
import { MemberAvatar } from '../member-avatar/MemberAvatar';
import { AvatarSize } from '../member-avatar/MemberAvatar.types';
import { profileContextSchema } from '../profile-context.schema';
import { ProfileSettings } from '../profile-settings/ProfileSettings';
import { ProfileSupport } from '../profile-support/ProfileSupport';
import styles from './ProfilePage.module.css';

/** Who the member is to everyone else, a way to change it, sign out, delete the account, and the support links. Stats and the admin group come with their own backend. */
export function ProfilePage() {
  const { t } = useTranslation();
  const { profile, hasGooglePhoto } = profileContextSchema.parse(useOutletContext());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const banned = profile.status === 'banned';
  const fullName = profile.display_name ?? '';

  return (
    <div className={styles.page}>
      <title>{`${t('profile.heading')} | ${t('app.name')}`}</title>
      <header className={styles.header}>
        <h1>{t('profile.heading')}</h1>
        {!banned && !isEditingProfile && (
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
      {banned && <BannedAccountNotice />}
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
          <MemberAvatar fullName={fullName} photoUrl={profile.avatar_url} size={AvatarSize.Large} />
          <div className={styles.text}>
            <h2>
              <bdi>{fullName}</bdi>
            </h2>
            <p className={styles.city}>
              <bdi>{profile.city}</bdi>
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
