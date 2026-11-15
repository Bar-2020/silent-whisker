import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from '@shared/auth/session';
import { EditIcon } from '@shared/components/icon/EditIcon';
import { Avatar } from '../avatar/Avatar';
import { BannedNotice } from '../banned-notice/BannedNotice';
import { EditProfileForm } from '../edit-profile-form/EditProfileForm';
import { FormButton } from '../form-button/FormButton';
import { useProfile } from '../use-profile';
import styles from './ProfilePage.module.css';

/** Who the member is to everyone else, a way to change it, and sign out. Stats and settings come with their own backend. */
export function ProfilePage() {
  const { t } = useTranslation();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const banned = profile.status === 'banned';
  const name = profile.display_name ?? '';

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
      {banned && <BannedNotice />}
      {editing ? (
        <EditProfileForm
          profile={profile}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : (
        <div className={styles.identity}>
          <Avatar name={name} photoUrl={profile.avatar_url} size="large" />
          <div className={styles.text}>
            <h2>
              <bdi>{name}</bdi>
            </h2>
            <p className={styles.city}>
              <bdi>{profile.city}</bdi>
            </p>
          </div>
        </div>
      )}
      <FormButton
        type="button"
        variant="secondary"
        pending={false}
        onClick={() => {
          void signOut();
        }}
      >
        {t('profile.signOut')}
      </FormButton>
    </div>
  );
}
