import { useEffect, useEffectEvent, useState } from 'react';
import { userManager } from '@shared/auth/user-manager';
import { forgetPendingRedirects, signInUnlessLooping } from './sign-in-loop';
import { SignInStatus } from './use-sign-in-status.types';

const redirected = (went: boolean): SignInStatus =>
  went ? SignInStatus.Redirecting : SignInStatus.RedirectStopped;

/**
 * Signed in means tokens are stored; an expired ID token is refreshed at the next call (D-59).
 * Without tokens the visit goes to Google and comes back to `returnTo`, unless that cannot start
 * or would loop: then the status says so and the caller shows a retry screen.
 */
export function useSignInStatus(returnTo: string): SignInStatus {
  const [status, setStatus] = useState(SignInStatus.Loading);

  // An effect event reads the latest `returnTo` without re-subscribing at every navigation.
  const read = useEffectEvent(() => {
    void userManager
      .getUser()
      .then((user) =>
        user ? SignInStatus.SignedIn : signInUnlessLooping(returnTo).then(redirected)
      )
      .then(setStatus);
  });

  useEffect(() => {
    read();
    // Back from Google: the browser may show this page from its cache without running anything.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      forgetPendingRedirects();
      read();
    };
    window.addEventListener('pageshow', onPageShow);
    // The tokens go away when a refresh is refused, a call answers 401 or the member signs out.
    const stopListening = userManager.events.addUserUnloaded(() => {
      read();
    });
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      stopListening();
    };
  }, []);

  return status;
}
