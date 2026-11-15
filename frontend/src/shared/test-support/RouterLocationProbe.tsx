import type { ReactElement } from 'react';
import { useLocation, useNavigationType } from 'react-router';

import { ROUTER_LOCATION_PROBE_TEST_ID } from './router-location';

/** Shows where the router is and how it got there (a replace is not a push). */
export function RouterLocationProbe(): ReactElement {
  const location = useLocation();
  const navigationType = useNavigationType();
  const label = `${location.pathname}${location.search}${location.hash}|${navigationType}`;
  return <output data-testid={ROUTER_LOCATION_PROBE_TEST_ID}>{label}</output>;
}
