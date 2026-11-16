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

export interface ProfileRowBase {
  readonly icon: ReactNode;
  readonly title: string;
  /** A quiet line under the title. */
  readonly hint?: ReactNode;
  readonly chip?: ProfileRowChip;
  /** Draws the arrow of a row that opens another page. */
  readonly opensPage?: boolean;
  readonly tone: ProfileRowTone;
}

/** What pressing the row does: runs a function, goes to a page of the app, or leaves the app for an address. */
export type ProfileRowProps = ProfileRowBase &
  (
    | {
        readonly onClick: () => void;
        readonly to?: never;
        readonly href?: never;
      }
    | { readonly to: string; readonly onClick?: never; readonly href?: never }
    | {
        readonly href: string;
        /** Opens a new tab with no link back to the app (for a web page, not for a `mailto:`). */
        readonly opensNewTab?: boolean;
        readonly onClick?: never;
        readonly to?: never;
      }
  );
