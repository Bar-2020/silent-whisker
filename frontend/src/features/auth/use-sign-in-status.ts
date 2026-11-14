import { useEffect, useState } from 'react';
import { userManager } from '@shared/auth/user-manager';
import type { SignInStatus } from './use-sign-in-status.types';

/** Signed in means tokens are stored; an expired ID token is refreshed at the next call (D-59). */
export function useSignInStatus(): SignInStatus {
  const [status, setStatus] = useState<SignInStatus>('loading');

  useEffect(() => {
    const read = () => {
      void userManager.getUser().then((user) => {
        setStatus(user ? 'signedIn' : 'signedOut');
      });
    };
    read();
    // The tokens go away when a refresh is refused, a call answers 401 or the member signs out.
    return userManager.events.addUserUnloaded(read);
  }, []);

  return status;
}
