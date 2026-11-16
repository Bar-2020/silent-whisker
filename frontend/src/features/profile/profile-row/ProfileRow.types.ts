import type { ReactNode } from 'react';

export enum ProfileRowTone {
  Normal = 'normal',
  /** For deleting the account: red, as the mocks draw it. */
  Bad = 'bad',
}

/** A small state tag at the end of the row: a tick and the word when on, a bar and the word when off. */
export interface ProfileRowChip {
  readonly label: string;
  readonly isOn: boolean;
}

export interface ProfileRowProps {
  readonly icon: ReactNode;
  readonly title: string;
  /** A quiet line under the title. */
  readonly hint?: string;
  readonly chip?: ProfileRowChip;
  /** Draws the arrow of a row that opens another page. */
  readonly opensPage?: boolean;
  readonly tone: ProfileRowTone;
  readonly onClick: () => void;
}
