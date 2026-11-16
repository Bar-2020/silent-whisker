import type { ReactNode } from 'react';

export enum InfoNoticeTone {
  /** Slate mist: something to know. */
  Neutral = 'neutral',
  /** Green: it is on, it worked. */
  Ok = 'ok',
  /** Red: a real error or a refusal the member can act on. */
  Bad = 'bad',
}

export interface InfoNoticeProps {
  readonly icon: ReactNode;
  readonly tone: InfoNoticeTone;
  /** A bold first line, when the notice says what happened before what to do. */
  readonly title?: string;
  readonly text: string;
}
