import { useQuery } from '@tanstack/react-query';
import { ErrorResponse } from 'oidc-client-ts';
import { Navigate, useLocation } from 'react-router';
import { AFTER_SIGN_IN_PATH } from '@constants/sign-in';
import { signIn } from '@shared/auth/session';
import { userManager } from '@shared/auth/user-manager';
import { AuthFailedScreen } from '../auth-failed-screen/AuthFailedScreen';
import { returnToSchema } from '../return-to.schema';
import { TokensNotKeptError } from '../tokens-not-kept-error';

async function completeSignIn(): Promise<string> {
  const user = await userManager.signinRedirectCallback();
  if (!(await userManager.getUser())) throw new TokensNotKeptError();
  return returnToSchema.parse(user.state);
}

/** Where Cognito sends the visitor back (D-59): store the tokens and return to the page they came from. */
export function AuthCallbackPage() {
  const { pathname, search } = useLocation();
  // A code works once: the query runs it once per address, also when React mounts the page twice.
  const { data: returnTo, error } = useQuery({
    queryKey: ['sign-in-callback', pathname, search],
    queryFn: completeSignIn,
    staleTime: Infinity,
  });

  if (returnTo) return <Navigate to={returnTo} replace />;
  // No automatic retry here: a refused sign-in that restarts itself would loop.
  if (error) {
    // A refusal still carries the page the visitor came from, so a retry returns there too.
    const retryPath =
      error instanceof ErrorResponse ? returnToSchema.parse(error.state) : AFTER_SIGN_IN_PATH;
    return <AuthFailedScreen kind="signIn" onRetry={() => void signIn(retryPath)} />;
  }
  return null;
}
