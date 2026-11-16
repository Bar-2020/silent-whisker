import type { TFunction } from 'i18next';
import { z } from 'zod';
import {
  PROFILE_NAME_MIN_LENGTH,
  PROFILE_TEXT_MAX_LENGTH,
  PROFILE_TEXT_MIN_LENGTH,
} from '@constants/profile';
import { profileUpdateSchema } from '@schemas/profile.schema';
import { PhotoChoice } from './profile-form.types';

// The server's own rule for a name (D-61, D-116) and a city, reused so the form never disagrees with it.
const profileName = profileUpdateSchema.shape.display_name.unwrap();
const profileText = profileUpdateSchema.shape.city.unwrap();
const NAME_LIMITS = { min: PROFILE_NAME_MIN_LENGTH, max: PROFILE_TEXT_MAX_LENGTH };
const CITY_LIMITS = { min: PROFILE_TEXT_MIN_LENGTH, max: PROFILE_TEXT_MAX_LENGTH };
const characters = (value: string): number => Array.from(value).length;

/** UX only: the server checks every rule again (R-01). The messages are already in the member's language. */
export function createProfileFormSchema(t: TFunction, requireTerms: boolean) {
  const text = (required: string, invalid: string) =>
    z
      .string()
      .trim()
      .min(1, required)
      .refine((value) => profileText.safeParse(value).success, invalid);
  // The length message first and alone; every other rule of a name has one message (D-116).
  const name = z
    .string()
    .trim()
    .min(1, t('firstrun.name.required'))
    .refine(
      (value) => characters(value) >= NAME_LIMITS.min && characters(value) <= NAME_LIMITS.max,
      { message: t('firstrun.name.invalid', NAME_LIMITS), abort: true }
    )
    .refine((value) => profileName.safeParse(value).success, t('firstrun.name.notName'));

  return z.object({
    fullName: name,
    cityName: text(t('firstrun.city.required'), t('firstrun.city.invalid', CITY_LIMITS)),
    photoChoice: z
      .enum(PhotoChoice)
      .refine((choice) => choice !== PhotoChoice.Unanswered, t('firstrun.photo.required')),
    termsAccepted: z
      .boolean()
      .refine((accepted) => accepted || !requireTerms, t('firstrun.terms.required')),
  });
}
