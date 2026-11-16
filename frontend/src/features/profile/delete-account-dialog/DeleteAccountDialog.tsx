import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteProfile } from '@shared/api/profile-api';
import { signOut } from '@shared/auth/session';
import { FormButton } from '@shared/components/form-button/FormButton';
import { FormButtonVariant } from '@shared/components/form-button/FormButton.types';
import { ModalDialog } from '@shared/components/modal-dialog/ModalDialog';
import { CancelButton } from '../cancel-button/CancelButton';
import { describeDeleteFailure } from '../delete-failure';
import { forgetFirstRunProgress } from '../first-run-progress';
import { FormMessage } from '../form-message/FormMessage';
import styles from './DeleteAccountDialog.module.css';

/**
 * Asks the server first (`confirm: false`, which deletes nothing) and deletes only when the red
 * button sends `confirm: true` (D-109). Then the member is signed out to the landing page.
 */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const check = useQuery({
    queryKey: ['profile-delete-check'],
    // Closing the dialog cancels a check that is still waiting, so opening it again starts a new one.
    queryFn: ({ signal }) => deleteProfile(false, signal),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  // Set at the press itself: `isPending` only changes after the next draw, so two clicks in one go would both pass.
  const isDeleteSent = useRef(false);
  const deletion = useMutation({
    mutationFn: () => deleteProfile(true),
    onSuccess: () => {
      // Before sign-out leaves the page, so signing in again starts the first run from the beginning (ME-03, D-110).
      forgetFirstRunProgress();
      return signOut();
    },
    onSettled: () => {
      isDeleteSent.current = false;
    },
  });
  const isPending = check.isPending || deletion.isPending;
  const failure = deletion.error ?? check.error;

  return (
    <ModalDialog title={t('profile.delete.confirm.title')} onClose={onClose}>
      <p>{t('profile.delete.confirm.text')}</p>
      {failure && (
        <FormMessage id="delete-account-message" message={describeDeleteFailure(failure, t)} />
      )}
      <div className={styles.buttons}>
        <FormButton
          type="button"
          variant={FormButtonVariant.Danger}
          pending={isPending}
          onClick={() => {
            // aria-busy does not stop the keyboard, so a second press is refused here.
            if (isPending || isDeleteSent.current) return;
            isDeleteSent.current = true;
            deletion.mutate();
          }}
        >
          {t('profile.delete.confirm')}
        </FormButton>
        <CancelButton onClick={onClose} />
      </div>
    </ModalDialog>
  );
}
