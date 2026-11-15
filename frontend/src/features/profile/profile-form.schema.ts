import type { TFunction } from 'i18next';
import { z } from 'zod';
import { PROFILE_TEXT_MAX_LENGTH, PROFILE_TEXT_MIN_LENGTH } from '@constants/profile';
import { profileUpdateSchema } from '@schemas/profile.schema';
import { PhotoChoice } from './profile-form.types';

// The server's own rule for a name and a city (D-61), reused so the form never disagrees with it.
const profileText = profileUpdateSchema.shape.display_name.unwrap();
const LENGTH_LIMITS = { min: PROFILE_TEXT_MIN_LENGTH, max: PROFILE_TEXT_MAX_LENGTH };

/** UX only: the server checks every rule again (R-01). The messages are already in the member's language. */
export function createProfileFormSchema(t: TFunction, requireTerms: boolean) {
  const text = (required: string, invalid: string) =>
    z
      .string()
      .trim()
      .min(1, required)
      .refine((value) => profileText.safeParse(value).success, invalid);

  return z.object({
    fullName: text(t('firstrun.name.required'), t('firstrun.name.invalid', LENGTH_LIMITS)),
    cityName: text(t('firstrun.city.required'), t('firstrun.city.invalid', LENGTH_LIMITS)),
    photoChoice: z
      .enum(PhotoChoice)
      .refine((choice) => choice !== PhotoChoice.Unanswered, t('firstrun.photo.required')),
    termsAccepted: z
      .boolean()
      .refine((accepted) => accepted || !requireTerms, t('firstrun.terms.required')),
  });
}
