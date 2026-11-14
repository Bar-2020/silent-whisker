import { ErrorResponse } from 'oidc-client-ts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AFTER_SIGN_IN_PATH } from '@constants/sign-in';
import { signIn } from '@shared/auth/session';
import { userManager } from '@shared/auth/user-manager';
import { AuthFailedScreen } from '../auth-failed-screen/AuthFailedScreen';
import { returnToSchema } from '../return-to.schema';

/** Thrown when the code was accepted but the browser kept no tokens (storage blocked): no loop. */
class TokensNotKeptError extends Error {}

async function completeSignIn(): Promise<string> {
  const user = await userManager.signinRedirectCallback();
  if (!(await userManager.getUser())) throw new TokensNotKeptError();
  return returnToSchema.parse(user.state);
}

// React runs an effect twice in development, and a code works once: both runs share one answer.
let pending: { href: string; result: Promise<string> } | undefined;

function completeOnce(): Promise<string> {
  const href = window.location.href;
  if (pending?.href !== href) pending = { href, result: completeSignIn() };
  return pending.result;
}

/** Where Cognito sends the visitor back (D-59): store the tokens and return to the page they came from. */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [retryPath, setRetryPath] = useState<string>();

  useEffect(() => {
    completeOnce()
      .then((returnTo) => {
        void navigate(returnTo, { replace: true });
      })
      .catch((error: unknown) => {
        // A refusal still carries the page the visitor came from, so a retry returns there too.
        setRetryPath(
          error instanceof ErrorResponse ? returnToSchema.parse(error.state) : AFTER_SIGN_IN_PATH
        );
      });
  }, [navigate]);

  // No automatic retry here: a refused sign-in that restarts itself would loop.
  if (retryPath === undefined) return null;
  return <AuthFailedScreen kind="signIn" onRetry={() => void signIn(retryPath)} />;
}
