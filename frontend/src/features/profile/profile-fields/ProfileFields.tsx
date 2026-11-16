import { CityField } from '../city-field/CityField';
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
      <CityField />
      {hasGooglePhoto && <PhotoChoiceField />}
    </>
  );
}
