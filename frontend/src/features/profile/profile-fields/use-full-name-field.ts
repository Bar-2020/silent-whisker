import { useFormContext } from 'react-hook-form';
import type { ProfileFormValues } from '../profile-form.types';

/** The full name box's props for `register` and its error in words. */
export function useFullNameField() {
  const {
    register,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();

  return {
    // Typing on takes the server's refusal away, so the member can try again (FIRST-09).
    inputProps: register('fullName', {
      onChange: () => {
        clearErrors('root.server');
      },
    }),
    errorMessage: errors.fullName?.message,
  };
}
