import { Outlet } from 'react-router';
import { SignUpForm } from '../sign-up-form/SignUpForm';
import { useProfile } from '../use-profile';

/**
 * Under the sign-in guard: until the current terms are accepted (the first time, and again when
 * they change) the sign-up form takes the place of every page (R-36, D-69). The server refuses
 * every other route meanwhile; this only shows the way out.
 */
export function RequireAcceptedTerms() {
  const profile = useProfile();
  return profile.terms_accepted ? <Outlet context={profile} /> : <SignUpForm profile={profile} />;
}
