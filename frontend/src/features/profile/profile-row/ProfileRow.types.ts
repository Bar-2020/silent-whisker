import type { ReactNode } from 'react';

export enum ProfileRowTone {
  Normal = 'normal',
  /** For deleting the account: red, as the mocks draw it. */
  Bad = 'bad',
}

export interface ProfileRowProps {
  readonly icon: ReactNode;
  readonly title: string;
  /** A quiet line under the title. */
  readonly hint?: string;
  /** Draws the arrow of a row that opens another page. */
  readonly opensPage?: boolean;
  readonly tone: ProfileRowTone;
  readonly onClick: () => void;
}
