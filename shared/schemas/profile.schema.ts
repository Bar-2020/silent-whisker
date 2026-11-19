import { z } from 'zod';
import {
  PROFILE_NAME_BLOCKED_WORDS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
} from '../constants/profile';
import { MEMBER_STATUS } from '../constants/member-status';

// The shape of `GET` and `PATCH /profile` (docs/API.md), once: the checks and the types come from here.

/** Control characters (a newline too) and the ones that reverse text direction (U+202A to U+202E, U+2066 to U+2069). */
const FORBIDDEN = /[\p{Cc}‪-‮⁦-⁩]/u;

/** At least one character a reader can see: not a space, a control or an invisible format character, and not a filler that draws nothing (a Hangul filler, a variation selector, a braille blank). */
const VISIBLE = /[^\s\p{C}\p{Default_Ignorable_Code_Point}\u2800]/u;

/** Counted in characters, not bytes (D-61, D-92). */
const characters = (text: string): number => Array.from(text).length;

/** Letters of the four languages with their marks, the joiners and direction marks real names carry (Arabic and Persian half-spaces, pasted Hebrew), and the spaces, hyphens, apostrophes and dots names use (D-116). */
const NAME_CHARACTERS =
  /^(?:[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Latin}\p{M}\u200C\u200E\u200F\u05BE '’׳״.-]|\u200D)+$/u;

const LETTER = /\p{L}/gu;
/** Variation selectors are marks to Unicode, but they draw nothing of their own (an emoji look, a letter's disguise). */
const VARIATION_SELECTOR = /\p{Variation_Selector}/u;
const THREE_IN_A_ROW = /(.)\1\1/iu;

/**
 * A full name is a real-looking one (D-116): 3 to 35 characters, spaces collapsed, only those
 * characters, at least three letters, no character three times in a row and no word of the blocked list.
 */
const profileName = z
  .string()
  .normalize('NFC')
  .trim()
  .refine((text) => characters(text) >= PROFILE_NAME_MIN_LENGTH)
  .refine((text) => characters(text) <= PROFILE_NAME_MAX_LENGTH)
  .refine((text) => !FORBIDDEN.test(text) && VISIBLE.test(text))
  .transform((text) => text.replace(/\s+/gu, ' '))
  .refine((text) => NAME_CHARACTERS.test(text))
  .refine((text) => !VARIATION_SELECTOR.test(text))
  .refine((text) => (text.match(LETTER) ?? []).length >= PROFILE_NAME_MIN_LENGTH)
  .refine((text) => !THREE_IN_A_ROW.test(text))
  .refine(
    (text) =>
      !text
        .toLocaleLowerCase()
        .split(/[ .'’׳״-]/u)
        .some((word) => PROFILE_NAME_BLOCKED_WORDS.some((blocked) => blocked === word))
  );

/** The body of `PATCH /profile`; any other field, such as `user_id` or `is_admin`, is dropped. */
export const profileUpdateSchema = z.object({
  display_name: profileName.optional(),
  /** The code of the city picked from the list (D-117); the server checks it against the list. */
  city_id: z.number().int().positive().optional(),
  show_google_photo: z.boolean().optional(),
  accept_terms: z.boolean().optional(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const profileResponseSchema = z.object({
  display_name: z.string().nullable(),
  city_id: z.number().nullable(),
  avatar_url: z.string().nullable(),
  show_google_photo: z.boolean(),
  status: z.enum(MEMBER_STATUS),
  terms_accepted: z.boolean(),
});
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

/** The body of `DELETE /profile`: `false` only checks, `true` deletes (D-109). */
export const profileDeleteSchema = z.object({ confirm: z.boolean() });

export const profileDeleteResponseSchema = z.object({ deleted: z.boolean() });
