import { z } from 'zod';

/** One row of the `users` table (docs/DATA.md). A new row has no name or city: they come with `PATCH /profile`. */
export const userRowSchema = z.object({
  user_id: z.string(),
  status: z.enum(['active', 'banned']),
  show_google_photo: z.boolean(),
  is_admin: z.boolean(),
  cats_helped: z.number(),
  feedings: z.number(),
  waters: z.number(),
  created_at: z.string(),
  avatar_url: z.string().optional(),
  display_name: z.string().optional(),
  city: z.string().optional(),
  city_lat: z.number().optional(),
  city_lng: z.number().optional(),
  terms_accepted_at: z.string().optional(),
  terms_version: z.number().optional(),
});
export type UserRow = z.infer<typeof userRowSchema>;

/** What one save writes onto a member's row. */
export type UserRowUpdate = Partial<
  Pick<
    UserRow,
    | 'display_name'
    | 'city'
    | 'city_lat'
    | 'city_lng'
    | 'show_google_photo'
    | 'terms_accepted_at'
    | 'terms_version'
  >
>;
