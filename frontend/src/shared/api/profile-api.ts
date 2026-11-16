import {
  profileDeleteResponseSchema,
  profileDeleteSchema,
  profileResponseSchema,
  profileUpdateSchema,
} from '@schemas/profile.schema';
import type { ProfileUpdate } from '@schemas/profile.schema';
import { apiRequest } from './api-client';

/** Where the profile lives under the API's prefix; all three calls use it. */
const PROFILE_API_PATH = '/profile';

/** The one cached copy of the member's profile: the guard loads it, a save replaces it. */
export const PROFILE_QUERY_KEY = ['profile'] as const;

/** The first call after sign-in also creates the member's row on the server (D-59). */
export const getProfile = () => apiRequest(PROFILE_API_PATH, profileResponseSchema);

/** The body is parsed with the same schema the server uses, so it leaves trimmed and normalised (D-101). */
export const updateProfile = (update: ProfileUpdate) =>
  apiRequest(PROFILE_API_PATH, profileResponseSchema, {
    method: 'PATCH',
    body: JSON.stringify(profileUpdateSchema.parse(update)),
  });

/** Two calls with one path (D-109): `false` only checks, `true` deletes the account for good. */
export const deleteProfile = (confirm: boolean, signal?: AbortSignal) =>
  apiRequest(PROFILE_API_PATH, profileDeleteResponseSchema, {
    method: 'DELETE',
    body: JSON.stringify(profileDeleteSchema.parse({ confirm })),
    signal,
  });
