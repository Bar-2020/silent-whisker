import { profileResponseSchema } from '@schemas/profile.schema';
import { apiRequest } from './api-client';

/** The first call after sign-in also creates the member's row on the server (D-59). */
export const getProfile = () => apiRequest('/profile', profileResponseSchema);
