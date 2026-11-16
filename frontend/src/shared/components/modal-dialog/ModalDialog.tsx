import { useId } from 'react';
import type { ModalDialogProps } from './ModalDialog.types';
import styles from './ModalDialog.module.css';

/** Opens the dialog when it is drawn, and closes it when the parent stops drawing it, so focus goes back to the button that opened it. */
const openOnMount = (dialog: HTMLDialogElement | null): (() => void) | undefined => {
  if (!dialog) return undefined;
  // A second call, from React running the ref twice in development, would throw on an open dialog.
  if (!dialog.open) dialog.showModal();
  return () => {
    dialog.close();
  };
};

/** A centred pane of glass over a scrim, open from the moment it is drawn (DESIGN.md, Dialogs and menus). */
export function ModalDialog({ title, onClose, children }: ModalDialogProps) {
  const titleId = useId();

  return (
    <dialog
      ref={openOnMount}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Only the scrim is the dialog itself: its content sits in the inner div.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className={styles.content}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
