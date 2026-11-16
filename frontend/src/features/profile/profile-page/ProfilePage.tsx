import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router';
import { signOut } from '@shared/auth/session';
import { EditIcon } from '@shared/components/icon/EditIcon';
import { PhoneIcon } from '@shared/components/icon/PhoneIcon';
import { SignOutIcon } from '@shared/components/icon/SignOutIcon';
import { TrashIcon } from '@shared/components/icon/TrashIcon';
import { BannedAccountNotice } from '../banned-account-notice/BannedAccountNotice';
import { DeleteAccountDialog } from '../delete-account-dialog/DeleteAccountDialog';
import { EditProfileForm } from '../edit-profile-form/EditProfileForm';
import { MemberAvatar } from '../member-avatar/MemberAvatar';
import { AvatarSize } from '../member-avatar/MemberAvatar.types';
import { profileContextSchema } from '../profile-context.schema';
import { ProfileRow } from '../profile-row/ProfileRow';
import { ProfileRowTone } from '../profile-row/ProfileRow.types';
import styles from './ProfilePage.module.css';
import { INSTALL_GUIDE_PATH } from '@constants/routes';

/** Who the member is to everyone else, a way to change it, sign out and delete the account. Stats and the other settings come with their own backend. */
export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, hasGooglePhoto } = profileContextSchema.parse(useOutletContext());
  const [editing, setEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const settingsTitleId = useId();
  const banned = profile.status === 'banned';
  const fullName = profile.display_name ?? '';

  return (
    <div className={styles.page}>
      <title>{`${t('profile.heading')} | ${t('app.name')}`}</title>
      <header className={styles.header}>
        <h1>{t('profile.heading')}</h1>
        {!banned && !editing && (
          <button
            type="button"
            className={styles.edit}
            aria-label={t('profile.edit.title')}
            onClick={() => {
              setEditing(true);
            }}
          >
            <EditIcon />
          </button>
        )}
      </header>
      {banned && <BannedAccountNotice />}
      {editing ? (
        <EditProfileForm
          profile={profile}
          hasGooglePhoto={hasGooglePhoto}
          onClose={() => {
            setEditing(false);
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
      <section className={styles.settings} aria-labelledby={settingsTitleId}>
        <h2 id={settingsTitleId}>{t('profile.settings.title')}</h2>
        <div className={styles.rows}>
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
            onClick={() => {
              setIsDeleting(true);
            }}
          />
        </div>
      </section>
      {isDeleting && (
        <DeleteAccountDialog
          onClose={() => {
            setIsDeleting(false);
          }}
        />
      )}
    </div>
  );
}
