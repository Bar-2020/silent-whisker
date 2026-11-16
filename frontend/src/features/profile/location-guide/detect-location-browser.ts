import { InstallBrowser } from '../install-guide/install-guide.types';
import { detectInstallBrowser } from '../install-guide/detect-install-browser';
import { LocationBrowser } from './location-guide.types';

/** Which location guide fits this browser, or null when none does (Opera, a bot): then every guide stays closed. */
export function detectLocationBrowser(
  userAgent: string,
  maxTouchPoints: number
): LocationBrowser | null {
  switch (detectInstallBrowser(userAgent, maxTouchPoints)) {
    case InstallBrowser.Iphone:
      return LocationBrowser.Iphone;
    case InstallBrowser.Android:
      return LocationBrowser.Android;
    case InstallBrowser.Mac:
      return LocationBrowser.Safari;
    case InstallBrowser.Computer:
      return userAgent.includes('Edg/') ? LocationBrowser.Edge : LocationBrowser.Chrome;
    case null:
      // The install guide has no part for Firefox (it cannot install a site), the location one does.
      return userAgent.includes('Firefox/') ? LocationBrowser.Firefox : null;
  }
}
