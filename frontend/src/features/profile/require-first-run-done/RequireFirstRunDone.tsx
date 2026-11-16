import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import {
  isInstallStepDone,
  isLocationStepDone,
  markInstallStepDone,
  markLocationStepDone,
} from '../first-run-progress';
import { InstallStep } from '../install-step/InstallStep';
import { LocationStep } from '../location-step/LocationStep';
import { hasGeolocation, useLocationPermission } from '../use-location-permission';
import { LocationPermission } from '../use-location-permission.types';

/**
 * Under the terms gate: the steps of the first run that come after the sign-up form take the place
 * of every page until each one's flag is set on this device (D-110, D-111). Only pressing a button
 * sets a flag, so closing the tab at a step shows the step again.
 */
export function RequireFirstRunDone() {
  const context: unknown = useOutletContext();
  const [isInstallDone, setIsInstallDone] = useState(isInstallStepDone);
  const [isLocationDone, setIsLocationDone] = useState(isLocationStepDone);
  const { permission } = useLocationPermission();

  if (!isInstallDone) {
    return (
      <InstallStep
        onContinue={() => {
          // The screen leaves first: a browser that refuses the write must not trap the member on this step.
          setIsInstallDone(true);
          markInstallStepDone();
        }}
      />
    );
  }
  // Already on, or no way to ask: the step is skipped and no flag is set (D-31, D-111).
  if (!isLocationDone && hasGeolocation()) {
    // Nothing to show until the browser has said whether location is already on.
    if (permission === undefined) return null;
    if (permission !== LocationPermission.Granted) {
      return (
        <LocationStep
          onDone={() => {
            setIsLocationDone(true);
            markLocationStepDone();
          }}
        />
      );
    }
  }
  return <Outlet context={context} />;
}
