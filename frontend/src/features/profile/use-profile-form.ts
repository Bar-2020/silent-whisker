import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '@schemas/profile.schema';
import { buildUpdate, changesNothing, initialValues, validateProfileForm } from './profile-form';
import { FormMode } from './profile-form.types';
import type { FieldIssues, ProfileFormValues } from './profile-form.types';
import { describeFailure, isBannedFailure } from './save-failure';
import { useSaveProfile } from './use-save-profile';

/**
 * The state of the sign-up form and of the edit form: what was typed, what to say about it (after
 * the first press, FIRST-02) and the save. `onSaved` runs when an edit is saved or needed no save.
 */
export function useProfileForm({
  profile,
  mode,
  askPhoto,
  onSaved,
}: {
  profile: ProfileResponse;
  mode: FormMode;
  /** Whether Google sent a photo, so the photo question is asked (D-105). */
  askPhoto: boolean;
  onSaved?: () => void;
}) {
  const { i18n } = useTranslation();
  const save = useSaveProfile();
  const [values, setValues] = useState(() => initialValues(profile, mode));
  const [pressed, setPressed] = useState(false);
  const setup = { mode, askPhoto };
  const issues = validateProfileForm(values, setup);
  const banned = profile.status === 'banned' || isBannedFailure(save.error);
  const failure = save.error && !banned ? describeFailure(save.error, i18n.language) : null;

  const change = (patch: Partial<ProfileFormValues>) => {
    save.reset();
    setValues({ ...values, ...patch });
  };

  const submit = () => {
    setPressed(true);
    // One request at a time: a second press while one is on its way does nothing (FIRST-03).
    if (save.isPending || Object.keys(issues).length > 0) return;
    const update = buildUpdate(values, setup);
    if (mode === FormMode.Edit && changesNothing(profile, update)) {
      onSaved?.();
      return;
    }
    save.mutate(update, { onSuccess: onSaved });
  };

  const shown: FieldIssues = {
    ...(pressed && issues),
    ...(failure?.field && { [failure.field]: failure.issue }),
  };

  return {
    values,
    change,
    submit,
    askPhoto,
    banned,
    pending: save.isPending,
    fieldIssues: shown,
    generalIssue: failure?.field === null ? failure.issue : undefined,
  };
}

export type ProfileFormState = ReturnType<typeof useProfileForm>;
