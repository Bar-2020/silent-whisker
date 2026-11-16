import type { ParseKeys } from 'i18next';

/** The four ways to put the site on a device (D-01); each has its own guide. */
export enum InstallBrowser {
  Iphone = 'iphone',
  Android = 'android',
  Computer = 'computer',
  Mac = 'mac',
}

export interface InstallGuideEntry {
  readonly browser: InstallBrowser;
  readonly titleKey: ParseKeys;
  readonly stepKeys: readonly ParseKeys[];
}
