import { z } from 'zod';
import { MEMBER_STATUS } from '../../../shared/constants/member-status';

/** One row of the `users` table (docs/DATA.md). A new row has no name or city: they come with `PATCH /profile`. */
export const userRowSchema = z.object({
  user_id: z.string(),
  status: z.enum(MEMBER_STATUS),
  // A banned member's deleted account leaves only `user_id` and `status` (D-71), read with these defaults (D-109).
  show_google_photo: z.boolean().default(false),
  is_admin: z.boolean().default(false),
  cats_helped: z.number().default(0),
  feedings: z.number().default(0),
  waters: z.number().default(0),
  created_at: z.string().optional(),
  avatar_url: z.string().optional(),
  display_name: z.string().optional(),
  /** The code of the picked city; its position is read from the list (D-117). */
  city_id: z.number().optional(),
  terms_accepted_at: z.string().optional(),
  terms_version: z.number().optional(),
  chat_restricted_until: z.string().optional(),
  /** Set when the member deletes the account: the row then holds only `user_id`, `status` and this (D-109). */
  deleted_at: z.string().optional(),
});
export type UserRow = z.infer<typeof userRowSchema>;

/** Personal attributes that older rows may still hold (the typed city and its lookup, D-117): not in the schema, but a deleted account must lose them too. */
export const RETIRED_PERSONAL_FIELDS = ['city', 'city_lat', 'city_lng'] as const;

/** What one save writes onto a member's row. */
export type UserRowUpdate = Partial<
  Pick<
    UserRow,
    'display_name' | 'city_id' | 'show_google_photo' | 'terms_accepted_at' | 'terms_version'
  >
>;
