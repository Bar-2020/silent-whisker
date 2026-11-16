import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import { isInstallStepDone, markInstallStepDone } from '../first-run-progress';
import { InstallStep } from '../install-step/InstallStep';

/**
 * Under the terms gate: the steps of the first run that come after the sign-up form take the place
 * of every page until each one's flag is set on this device (D-110). Only pressing Continue sets it,
 * so closing the tab at a step shows the step again.
 */
export function RequireFirstRunDone() {
  const context: unknown = useOutletContext();
  const [isInstallDone, setIsInstallDone] = useState(isInstallStepDone);
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
  return <Outlet context={context} />;
}
