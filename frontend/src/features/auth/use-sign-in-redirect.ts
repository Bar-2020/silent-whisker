import { useEffect, useState } from 'react';
import { signInUnlessLooping } from './sign-in-loop';
import type { SignInStatus } from './use-sign-in-status.types';

/** Sends a signed-out visit to Google; true when it could not go, so a retry screen must show. */
export function useSignInRedirect(status: SignInStatus, returnTo: string): boolean {
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (status !== 'signedOut') return;
    void signInUnlessLooping(returnTo).then((went) => {
      setStopped(!went);
    });
  }, [status, returnTo]);

  return stopped;
}
