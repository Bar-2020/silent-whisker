import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  GEOLOCATION_ERROR_CODES,
  LOCATION_GRANTED_STORAGE_KEY,
  LOCATION_REQUEST_TIMEOUT_MS,
} from '@constants/location';
import { LocationPermission } from './use-location-permission.types';

const LOCATION_PERMISSION_QUERY_KEY = ['location-permission'];

const PERMISSION_BY_STATE: Record<PermissionState, LocationPermission> = {
  granted: LocationPermission.Granted,
  denied: LocationPermission.Denied,
  prompt: LocationPermission.Prompt,
};

/** False in a browser that cannot give a position at all, so there is nothing to ask. */
export const hasGeolocation = (): boolean => 'geolocation' in navigator;

// Firefox does not show a site permission it saved in the Permissions API: after an allow it still
// says "prompt" (Mozilla bugs 1803600 and 1924572). Only there, the app's own last answer is believed (D-115).
const hidesSavedGrant = (): boolean => /Firefox|FxiOS/.test(navigator.userAgent);

async function readPermission(): Promise<LocationPermission> {
  try {
    const { state } = await navigator.permissions.query({ name: 'geolocation' });
    const permission = PERMISSION_BY_STATE[state];
    return permission === LocationPermission.Prompt &&
      hidesSavedGrant() &&
      localStorage.getItem(LOCATION_GRANTED_STORAGE_KEY) !== null
      ? LocationPermission.Granted
      : permission;
  } catch {
    // A browser without the Permissions API, or one that refuses this permission name, cannot say.
    return LocationPermission.Unsupported;
  }
}

function rememberAnswer(isGranted: boolean): void {
  if (isGranted) localStorage.setItem(LOCATION_GRANTED_STORAGE_KEY, 'granted');
  else localStorage.removeItem(LOCATION_GRANTED_STORAGE_KEY);
}

// The position is thrown away: only the permission matters (D-111). Only a refusal says no: a
// timeout or no signal means the browser let the app ask.
const askForPosition = () =>
  new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        // Resolve first: a browser that refuses the write must not leave the member waiting on the step.
        resolve();
        rememberAnswer(true);
      },
      (error) => {
        resolve();
        rememberAnswer(error.code !== GEOLOCATION_ERROR_CODES.PERMISSION_DENIED);
      },
      { enableHighAccuracy: true, timeout: LOCATION_REQUEST_TIMEOUT_MS }
    );
  });

/** The location permission as the browser reports it, and a way to ask for it; asking reads it again. */
export function useLocationPermission() {
  const queryClient = useQueryClient();
  const { data: permission } = useQuery({
    queryKey: LOCATION_PERMISSION_QUERY_KEY,
    queryFn: readPermission,
  });
  const request = useMutation({
    mutationFn: askForPosition,
    onSettled: () => queryClient.invalidateQueries({ queryKey: LOCATION_PERMISSION_QUERY_KEY }),
  });
  // `isPending` only changes after the next draw, so a fast second tap shares the request in flight.
  const inFlight = useRef<Promise<unknown> | null>(null);
  const requestPermission = () => {
    inFlight.current ??= request.mutateAsync().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  };

  return { permission, isRequesting: request.isPending, requestPermission };
}
