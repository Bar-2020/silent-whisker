import { PhotoChoiceField } from '../photo-choice-field/PhotoChoiceField';
import { ProfileTextField } from '../profile-text-field/ProfileTextField';
import { Field } from '../profile-form.types';
import type { ProfileFormState } from '../use-profile-form';

/** The three questions both forms ask: the full name, the city and, when Google sent one, the photo (D-27). */
export function ProfileFields({ form }: { form: ProfileFormState }) {
  const { values, change, fieldIssues, askPhoto } = form;

  return (
    <>
      <ProfileTextField
        id="profile-name"
        labelKey="firstrun.name.label"
        placeholderKey="firstrun.name.placeholder"
        hintKey="firstrun.name.hint"
        autoComplete="name"
        value={values.name}
        onChange={(name) => {
          change({ name });
        }}
        issue={fieldIssues[Field.Name]}
      />
      <ProfileTextField
        id="profile-city"
        labelKey="firstrun.city.label"
        placeholderKey="firstrun.city.placeholder"
        hintKey="firstrun.city.hint"
        autoComplete="address-level2"
        value={values.city}
        onChange={(city) => {
          change({ city });
        }}
        issue={fieldIssues[Field.City]}
      />
      {askPhoto && (
        <PhotoChoiceField
          name={values.name}
          value={values.photo}
          onChange={(photo) => {
            change({ photo });
          }}
          issue={fieldIssues[Field.Photo]}
        />
      )}
    </>
  );
}
