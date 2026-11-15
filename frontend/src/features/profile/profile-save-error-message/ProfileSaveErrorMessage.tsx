import { useFormContext } from 'react-hook-form';
import { FormMessage } from '../form-message/FormMessage';
import type { ProfileFormValues } from '../profile-form.types';

/** Above the buttons: why the server refused the profile save, when it was not about one field (D-62, D-61). */
export function ProfileSaveErrorMessage() {
  const {
    formState: { errors },
  } = useFormContext<ProfileFormValues>();
  const message = errors.root?.server.message;

  return message ? <FormMessage id="profile-form-message" message={message} /> : null;
}
