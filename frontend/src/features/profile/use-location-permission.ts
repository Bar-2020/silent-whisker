import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { LOCATION_REQUEST_TIMEOUT_MS } from '@constants/location';
import { LocationPermission } from './use-location-permission.types';

const LOCATION_PERMISSION_QUERY_KEY = ['location-permission'];

const PERMISSION_BY_STATE: Record<PermissionState, LocationPermission> = {
  granted: LocationPermission.Granted,
  denied: LocationPermission.Denied,
  prompt: LocationPermission.Prompt,
};

/** False in a browser (or an old one) that cannot give a position at all, so there is nothing to ask. */
export const hasGeolocation = (): boolean => 'geolocation' in navigator;

async function readPermission(): Promise<LocationPermission> {
  if (!('permissions' in navigator)) return LocationPermission.Unsupported;
  try {
    const { state } = await navigator.permissions.query({ name: 'geolocation' });
    return PERMISSION_BY_STATE[state];
  } catch {
    // Some browsers have the API but refuse this permission name: the same as having no API.
    return LocationPermission.Unsupported;
  }
}

/** Resolves once the browser has answered, however it answered: only the permission matters (D-111). */
const askForPosition = () =>
  new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        resolve();
      },
      () => {
        resolve();
      },
      { enableHighAccuracy: true, timeout: LOCATION_REQUEST_TIMEOUT_MS }
    );
  });

/**
 * The location permission as the browser reports it, and a way to ask for it. Nothing here reads
 * or keeps a position (D-111); asking again reads the permission again, so every screen shows the answer.
 */
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

  // `isPending` only changes after the next draw, so a fast second tap shares the request in flight instead of asking the browser again.
  const inFlight = useRef<Promise<void> | null>(null);
  const requestPermission = () => {
    inFlight.current ??= request.mutateAsync().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  };

  return { permission, isRequesting: request.isPending, requestPermission };
}
