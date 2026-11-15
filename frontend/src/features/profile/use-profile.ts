import { useOutletContext } from 'react-router';
import { profileResponseSchema } from '@schemas/profile.schema';
import type { ProfileResponse } from '@schemas/profile.schema';

/** The profile the sign-in guard loaded and handed down through the router (D-101). */
export function useProfile(): ProfileResponse {
  return profileResponseSchema.parse(useOutletContext());
}
