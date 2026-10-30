import { z } from 'zod';
import { PROFILE_TEXT_MAX_LENGTH, PROFILE_TEXT_MIN_LENGTH } from '../constants/profile';

// The shape of `GET` and `PATCH /profile` (docs/API.md), once: the checks and the types come from here.

/** Control characters (a newline too) and the ones that reverse text direction (U+202A to U+202E, U+2066 to U+2069). */
const FORBIDDEN = /[\p{Cc}‪-‮⁦-⁩]/u;

/** At least one character a reader can see: not a space, and not a control or invisible format character. */
const VISIBLE = /[^\s\p{C}]/u;

/** Counted in characters, not bytes (D-61, D-92). */
const characters = (text: string): number => Array.from(text).length;

const profileText = z
  .string()
  .normalize('NFC')
  .trim()
  .refine((text) => characters(text) >= PROFILE_TEXT_MIN_LENGTH)
  .refine((text) => characters(text) <= PROFILE_TEXT_MAX_LENGTH)
  .refine((text) => !FORBIDDEN.test(text) && VISIBLE.test(text));

/** The body of `PATCH /profile`; any other field, such as `user_id` or `is_admin`, is dropped. */
export const profileUpdateSchema = z.object({
  display_name: profileText.optional(),
  city: profileText.optional(),
  show_google_photo: z.boolean().optional(),
  accept_terms: z.boolean().optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

const profileResponseSchema = z.object({
  display_name: z.string().nullable(),
  city: z.string().nullable(),
  avatar_url: z.string().nullable(),
  show_google_photo: z.boolean(),
  status: z.enum(['active', 'banned']),
  terms_accepted: z.boolean(),
});
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
