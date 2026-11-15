import type { ProfileUpdate } from '@schemas/profile.schema';
import { PhotoChoice } from './profile-form.types';
import type { ProfileFormValues } from './profile-form.types';

/** The body of `PATCH /profile` from the form; the photo answer is sent only when it was asked (D-108). */
export function buildProfileUpdate(
  { name, city, photo }: ProfileFormValues,
  hasGooglePhoto: boolean
): ProfileUpdate {
  return {
    display_name: name,
    city,
    ...(hasGooglePhoto && { show_google_photo: photo === PhotoChoice.Show }),
  };
}
