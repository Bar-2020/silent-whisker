import { useEffect, useState } from 'react';
import { userManager } from '@shared/auth/user-manager';
import { signInUnlessLooping } from './sign-in-loop';
import { SignInStatus } from './use-sign-in-status.types';

/**
 * Signed in means tokens are stored; an expired ID token is refreshed at the next call (D-59).
 * Without tokens the visit goes to Google and comes back to `returnTo`, unless that cannot start
 * or would loop: then the status says so and the caller shows a retry screen.
 */
export function useSignInStatus(returnTo: string): SignInStatus {
  const [status, setStatus] = useState(SignInStatus.Loading);

  useEffect(() => {
    const read = () => {
      void userManager
        .getUser()
        .then((user) =>
          user ? SignInStatus.SignedIn : signInUnlessLooping(returnTo).then(redirected)
        )
        .then(setStatus);
    };
    read();
    // The tokens go away when a refresh is refused, a call answers 401 or the member signs out.
    return userManager.events.addUserUnloaded(read);
  }, [returnTo]);

  return status;
}

const redirected = (went: boolean): SignInStatus =>
  went ? SignInStatus.Redirecting : SignInStatus.RedirectStopped;
