import type { ParseKeys } from 'i18next';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormMessage } from '../form-message/FormMessage';
import { ProfileFieldFrame } from '../profile-field-frame/ProfileFieldFrame';
import { ProfileTextBox } from '../profile-text-box/ProfileTextBox';
import type { ProfileFormValues } from '../profile-form.types';

/** A labelled text box with its hint and, once there is one, its error in words (DESIGN.md, Inputs). */
export function ProfileTextField({
  name,
  labelKey,
  placeholderKey,
  hintKey,
  autoComplete,
}: {
  name: 'fullName';
  labelKey: ParseKeys;
  placeholderKey: ParseKeys;
  hintKey: ParseKeys;
  autoComplete: string;
}) {
  const { t } = useTranslation();
  const {
    register,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const id = `profile-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const message = errors[name]?.message;

  return (
    <ProfileFieldFrame
      id={id}
      label={t(labelKey)}
      hintId={hintId}
      hint={t(hintKey)}
      below={message && <FormMessage id={errorId} message={message} />}
    >
      <ProfileTextBox
        id={id}
        autoComplete={autoComplete}
        placeholder={t(placeholderKey)}
        aria-required="true"
        aria-invalid={message !== undefined}
        aria-describedby={message ? `${hintId} ${errorId}` : hintId}
        // Typing on takes the server's refusal away, so the member can try again (FIRST-09).
        {...register(name, {
          onChange: () => {
            clearErrors('root.server');
          },
        })}
      />
    </ProfileFieldFrame>
  );
}
