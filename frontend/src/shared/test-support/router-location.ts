export const ROUTER_LOCATION_PROBE_TEST_ID = 'probe';

/** The probe's text: the router's path, search and hash, then `|` and how it got there. */
const readProbeText = (): string =>
  document.querySelector(`[data-testid="${ROUTER_LOCATION_PROBE_TEST_ID}"]`)?.textContent ?? '';

export const readCurrentPath = (): string => readProbeText().split('|')[0];
