import type { ReactNode } from 'react';

export enum FormButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Quiet = 'quiet',
}

export type FormButtonType = 'submit' | 'button';

export interface FormButtonProps {
  readonly type: FormButtonType;
  readonly variant: FormButtonVariant;
  /** While true the button shows only a spinner and takes no taps. */
  readonly pending: boolean;
  readonly onClick?: () => void;
  readonly children: ReactNode;
}
