import type { ReactNode } from 'react';

export interface ModalDialogProps {
  readonly title: string;
  /** Called when the dialog has closed, by Escape or a tap on the scrim; the parent then stops drawing it. */
  readonly onClose: () => void;
  readonly children: ReactNode;
}
