import type { ProfileUpdate } from '@schemas/profile.schema';
import { PhotoChoice } from './profile-form.types';
import type { ProfileFormValues } from './profile-form.types';

/** The body of `PATCH /profile` from the form; the photo answer is sent only when it was asked (D-108). */
export function buildProfileUpdate(
  { fullName, cityId, photoChoice }: ProfileFormValues,
  hasGooglePhoto: boolean
): ProfileUpdate {
  return {
    display_name: fullName,
    ...(cityId !== null && { city_id: cityId }),
    ...(hasGooglePhoto && { show_google_photo: photoChoice === PhotoChoice.Show }),
  };
}
