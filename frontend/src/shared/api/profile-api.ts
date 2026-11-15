import { profileResponseSchema, profileUpdateSchema } from '@schemas/profile.schema';
import type { ProfileUpdate } from '@schemas/profile.schema';
import { apiRequest } from './api-client';

/** The one cached copy of the member's profile: the guard loads it, a save replaces it. */
export const PROFILE_QUERY_KEY = ['profile'] as const;

/** The first call after sign-in also creates the member's row on the server (D-59). */
export const getProfile = () => apiRequest('/profile', profileResponseSchema);

/** The body is parsed with the same schema the server uses, so it leaves trimmed and normalised (D-101). */
export const updateProfile = (update: ProfileUpdate) =>
  apiRequest('/profile', profileResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(profileUpdateSchema.parse(update)),
  });
