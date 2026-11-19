import { useFormContext } from 'react-hook-form';
import type { ProfileFormValues } from '../profile-form.types';

/** The photo question's radio props, the answer so far, the name the initials come from, and its error. */
export function usePhotoChoiceField() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormValues>();

  return {
    radioProps: register('photoChoice'),
    chosenAnswer: watch('photoChoice'),
    typedFullName: watch('fullName'),
    errorMessage: errors.photoChoice?.message,
  };
}
