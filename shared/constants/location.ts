/**
 * How long the location step waits for a position once the browser has allowed it. The position is
 * thrown away (only the permission matters, D-111), so a slow fix must not keep the member on the screen.
 * The wait for the member's own answer to the browser prompt is not counted in it.
 */
export const LOCATION_REQUEST_TIMEOUT_MS = 60_000;

/** Set when the app's last request for a position was allowed, removed when it was refused (D-115). */
export const LOCATION_GRANTED_STORAGE_KEY = 'location-granted';

/** The codes of a browser's location error (the web standard's `GeolocationPositionError`). */
export const GEOLOCATION_ERROR_CODES = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;
