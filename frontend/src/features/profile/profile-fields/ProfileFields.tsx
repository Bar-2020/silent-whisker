import { PhotoChoiceField } from '../photo-choice-field/PhotoChoiceField';
import { ProfileTextField } from '../profile-text-field/ProfileTextField';

/** The questions both forms ask: the full name, the city and, when Google sent a photo, the photo choice (D-27). */
export function ProfileFields({ hasGooglePhoto }: { hasGooglePhoto: boolean }) {
  return (
    <>
      <ProfileTextField
        name="fullName"
        labelKey="firstrun.name.label"
        placeholderKey="firstrun.name.placeholder"
        hintKey="firstrun.name.hint"
        autoComplete="name"
      />
      <ProfileTextField
        name="cityName"
        labelKey="firstrun.city.label"
        placeholderKey="firstrun.city.placeholder"
        hintKey="firstrun.city.hint"
        autoComplete="address-level2"
      />
      {hasGooglePhoto && <PhotoChoiceField />}
    </>
  );
}
