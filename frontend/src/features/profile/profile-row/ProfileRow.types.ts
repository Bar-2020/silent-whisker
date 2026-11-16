import type { ReactNode } from 'react';

export enum ProfileRowTone {
  Normal = 'normal',
  /** For deleting the account: red, as the mocks draw it. */
  Bad = 'bad',
}

export interface ProfileRowProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly tone: ProfileRowTone;
  readonly onClick: () => void;
}
