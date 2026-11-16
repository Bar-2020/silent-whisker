import { InstallBrowser, type InstallGuideEntry } from './install-guide.types';

export const INSTALL_GUIDES: readonly InstallGuideEntry[] = [
  {
    browser: InstallBrowser.Iphone,
    titleKey: 'profile.install.iphone',
    stepKeys: ['profile.install.iphone1', 'profile.install.iphone2', 'profile.install.iphone3'],
  },
  {
    browser: InstallBrowser.Android,
    titleKey: 'profile.install.android',
    stepKeys: ['profile.install.android1', 'profile.install.android2', 'profile.install.android3'],
  },
  {
    browser: InstallBrowser.Computer,
    titleKey: 'profile.install.chrome',
    stepKeys: ['profile.install.chrome1', 'profile.install.chrome2'],
  },
  {
    browser: InstallBrowser.Mac,
    titleKey: 'profile.install.safari',
    stepKeys: ['profile.install.safari1', 'profile.install.safari2'],
  },
];
