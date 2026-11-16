import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';
import { MEMBER_HOME_PATH } from '@constants/routes';
import { hasSession } from '@shared/auth/session';

/**
 * Around the landing page: a member who is signed in never sees it, and goes to their home instead
 * (D-114). It reads the stored tokens only, so a signed-out visit makes no call and no redirect (D-39).
 */
export function SendMemberHome() {
  // Read at every visit: the answer changes when the member signs in or out.
  const { data: isSignedIn } = useQuery({
    queryKey: ['has-session'],
    queryFn: hasSession,
    gcTime: 0,
  });
  if (isSignedIn === undefined) return null;
  return isSignedIn ? <Navigate to={MEMBER_HOME_PATH} replace /> : <Outlet />;
}
