import type { ReactNode } from 'react';

export enum FormButtonVariant {
  Primary = 'primary',
  Quiet = 'quiet',
  /** For what cannot be undone, such as deleting the account (DESIGN.md, Dialogs and menus). */
  Danger = 'danger',
}

export type FormButtonType = 'submit' | 'button';

export interface FormButtonProps {
  readonly type: FormButtonType;
  readonly variant: FormButtonVariant;
  /** While true the button shows only a spinner and takes no taps. */
  readonly pending: boolean;
  /** Takes no taps and no key presses, and looks it (a button next to one that waits, for example). */
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly children: ReactNode;
}
