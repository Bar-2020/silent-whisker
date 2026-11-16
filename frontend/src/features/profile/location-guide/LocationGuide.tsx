import { BrowserGuides } from '../browser-guides/BrowserGuides';
import { detectLocationBrowser } from './detect-location-browser';
import { LOCATION_GUIDES } from './location-guides';

/** How to turn location back on, one part per browser; the part for this browser is open (D-31, D-111). */
export function LocationGuide() {
  const detected = detectLocationBrowser(navigator.userAgent, navigator.maxTouchPoints);

  return <BrowserGuides guides={LOCATION_GUIDES} openBrowser={detected} />;
}
