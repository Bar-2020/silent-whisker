import { BrowserGuides } from '../browser-guides/BrowserGuides';
import { detectInstallBrowser } from './detect-install-browser';
import { INSTALL_GUIDES } from './install-guides';

/** How to put the app on the home screen, one part per browser; the part for this browser is open (D-01, D-110). */
export function InstallGuide() {
  const detected = detectInstallBrowser(navigator.userAgent, navigator.maxTouchPoints);

  return <BrowserGuides guides={INSTALL_GUIDES} openBrowser={detected} />;
}
