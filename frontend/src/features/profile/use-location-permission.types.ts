/** What the browser says about the location permission. `Unsupported` is a browser with no Permissions API: it cannot say. */
export enum LocationPermission {
  Granted = 'granted',
  Denied = 'denied',
  Prompt = 'prompt',
  Unsupported = 'unsupported',
}
