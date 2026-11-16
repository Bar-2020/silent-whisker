import { InstallBrowser } from './install-guide.types';

/** Which guide fits this browser, or null when none does (Firefox, Opera, a bot): then every guide stays closed. */
export function detectInstallBrowser(
  userAgent: string,
  maxTouchPoints: number
): InstallBrowser | null {
  if (/iPhone|iPad|iPod/.test(userAgent)) return InstallBrowser.Iphone;
  if (userAgent.includes('Android')) return InstallBrowser.Android;
  if (userAgent.includes('Macintosh')) {
    // An iPad asks for the desktop site and calls itself a Mac, but a real Mac has no touch screen.
    if (maxTouchPoints > 1) return InstallBrowser.Iphone;
    if (!userAgent.includes('Chrome/'))
      return userAgent.includes('Safari/') ? InstallBrowser.Mac : null;
  }
  // Opera also says Chrome, but it has no install step to describe.
  const isChromeOrEdge = /Chrome\/|Edg\//.test(userAgent) && !userAgent.includes('OPR/');
  return isChromeOrEdge ? InstallBrowser.Computer : null;
}
