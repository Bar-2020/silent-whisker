import { z } from 'zod';
import { profileResponseSchema } from '@schemas/profile.schema';

/** What the route element under the sign-in guard hands to the profile screens (D-101). */
export const profileContextSchema = z.object({
  profile: profileResponseSchema,
  hasGooglePhoto: z.boolean(),
});
export type ProfileContext = z.infer<typeof profileContextSchema>;
