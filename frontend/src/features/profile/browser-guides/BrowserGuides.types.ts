import type { ParseKeys } from 'i18next';

/** One part of a how-to that differs by browser: a title and its numbered steps. */
export interface BrowserGuideEntry {
  /** What tells the parts apart; the part whose `browser` is the open one starts open. */
  readonly browser: string;
  readonly titleKey: ParseKeys;
  readonly stepKeys: readonly ParseKeys[];
}
