import { detectInstallBrowser } from '../install-guide/detect-install-browser';
import { InstallBrowser } from '../install-guide/install-guide.types';
import { LocationBrowser } from './location-guide.types';

const LOCATION_BROWSER_BY_INSTALL_BROWSER: Record<InstallBrowser, LocationBrowser> = {
  [InstallBrowser.Iphone]: LocationBrowser.Iphone,
  [InstallBrowser.Android]: LocationBrowser.Android,
  [InstallBrowser.Computer]: LocationBrowser.Chrome,
  [InstallBrowser.Mac]: LocationBrowser.Safari,
};

/** Which location guide fits this browser, or null when none does (Opera, a bot): then every guide stays closed. */
export function detectLocationBrowser(
  userAgent: string,
  maxTouchPoints: number
): LocationBrowser | null {
  const installBrowser = detectInstallBrowser(userAgent, maxTouchPoints);
  // The install guide has no part for Firefox (it cannot install a site), the location one does.
  if (installBrowser === null)
    return userAgent.includes('Firefox/') ? LocationBrowser.Firefox : null;
  const browser = LOCATION_BROWSER_BY_INSTALL_BROWSER[installBrowser];
  // The install guide has one part for Chrome and Edge, the location one has two.
  return browser === LocationBrowser.Chrome && userAgent.includes('Edg/')
    ? LocationBrowser.Edge
    : browser;
}
