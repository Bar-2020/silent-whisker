import { PROFILE_TEXT_MAX_LENGTH, PROFILE_TEXT_MIN_LENGTH } from '@constants/profile';
import { profileUpdateSchema } from '@schemas/profile.schema';
import type { ProfileResponse, ProfileUpdate } from '@schemas/profile.schema';
import { Field, FormMode, PhotoChoice } from './profile-form.types';
import type { FieldIssues, Issue, ProfileFormSetup, ProfileFormValues } from './profile-form.types';

export function initialValues(profile: ProfileResponse, mode: FormMode): ProfileFormValues {
  const editedPhoto = profile.show_google_photo ? PhotoChoice.Show : PhotoChoice.Initials;
  return {
    name: profile.display_name ?? '',
    city: profile.city ?? '',
    photo: mode === FormMode.Edit ? editedPhoto : PhotoChoice.Unanswered,
    terms: false,
  };
}

const LENGTH_VALUES = { min: PROFILE_TEXT_MIN_LENGTH, max: PROFILE_TEXT_MAX_LENGTH };

/** The server's schema says whether a text is wrong; here an empty one is told apart from a bad one. */
function textIssue(
  text: string,
  requiredKey: Issue['key'],
  invalidKey: Issue['key'],
  wrong: boolean
): Issue | undefined {
  if (!wrong) return undefined;
  return text.trim() === '' ? { key: requiredKey } : { key: invalidKey, values: LENGTH_VALUES };
}

/** UX only: the server checks every rule again (R-01). The photo and terms answers are never preselected. */
export function validateProfileForm(
  values: ProfileFormValues,
  { mode, askPhoto }: ProfileFormSetup
): FieldIssues {
  const wrong = new Set(
    profileUpdateSchema
      .safeParse({ display_name: values.name, city: values.city })
      .error?.issues.map((issue) => issue.path[0])
  );
  const candidates: [Field, Issue | undefined][] = [
    [
      Field.Name,
      textIssue(
        values.name,
        'firstrun.name.required',
        'firstrun.name.invalid',
        wrong.has('display_name')
      ),
    ],
    [
      Field.City,
      textIssue(values.city, 'firstrun.city.required', 'firstrun.city.invalid', wrong.has('city')),
    ],
    [
      Field.Photo,
      askPhoto && values.photo === PhotoChoice.Unanswered
        ? { key: 'firstrun.photo.required' }
        : undefined,
    ],
    [
      Field.Terms,
      mode === FormMode.SignUp && !values.terms ? { key: 'firstrun.terms.required' } : undefined,
    ],
  ];
  return Object.fromEntries(candidates.filter(([, issue]) => issue !== undefined));
}

export function buildUpdate(
  values: ProfileFormValues,
  { mode, askPhoto }: ProfileFormSetup
): ProfileUpdate {
  return {
    display_name: values.name.trim().normalize('NFC'),
    city: values.city.trim().normalize('NFC'),
    ...(askPhoto && { show_google_photo: values.photo === PhotoChoice.Show }),
    ...(mode === FormMode.SignUp && { accept_terms: true }),
  };
}

/** An edit that changes nothing sends nothing, so it costs no write and no text check (D-61). */
export function changesNothing(profile: ProfileResponse, update: ProfileUpdate): boolean {
  return (
    update.accept_terms === undefined &&
    update.display_name === profile.display_name &&
    update.city === profile.city &&
    (update.show_google_photo ?? profile.show_google_photo) === profile.show_google_photo
  );
}
