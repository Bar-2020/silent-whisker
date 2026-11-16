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

/** False in a browser that cannot give a position at all, so there is nothing to ask. */
export const hasGeolocation = (): boolean => 'geolocation' in navigator;

async function readPermission(): Promise<LocationPermission> {
  try {
    const { state } = await navigator.permissions.query({ name: 'geolocation' });
    return PERMISSION_BY_STATE[state];
  } catch {
    // A browser without the Permissions API, or one that refuses this permission name, cannot say.
    return LocationPermission.Unsupported;
  }
}

// The position and the refusal are both thrown away: only the permission matters (D-111).
const askForPosition = () =>
  new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, resolve, {
      enableHighAccuracy: true,
      timeout: LOCATION_REQUEST_TIMEOUT_MS,
    });
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
