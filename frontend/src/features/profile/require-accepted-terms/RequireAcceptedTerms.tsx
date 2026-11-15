import { useQuery } from '@tanstack/react-query';
import { Outlet, useOutletContext } from 'react-router';
import { profileResponseSchema } from '@schemas/profile.schema';
import { checkGooglePhoto } from '@shared/auth/session';
import type { ProfileContext } from '../profile-context.schema';
import { SignUpForm } from '../sign-up-form/SignUpForm';

/**
 * Under the sign-in guard: until the current terms are accepted (the first time, and again when
 * they change) the sign-up form takes the place of every page (R-36, D-69). The server refuses
 * every other route meanwhile; this only shows the way out. It also reads the Google photo claim
 * once (D-108), and draws nothing until it knows, so the photo question never shows up late.
 */
export function RequireAcceptedTerms() {
  const profile = profileResponseSchema.parse(useOutletContext());
  const { data: hasGooglePhoto, isPending } = useQuery({
    queryKey: ['google-photo'],
    queryFn: checkGooglePhoto,
    staleTime: Infinity,
  });
  if (isPending) return null;
  if (!profile.terms_accepted) {
    return <SignUpForm profile={profile} hasGooglePhoto={hasGooglePhoto ?? false} />;
  }
  const context: ProfileContext = { profile, hasGooglePhoto: hasGooglePhoto ?? false };
  return <Outlet context={context} />;
}
