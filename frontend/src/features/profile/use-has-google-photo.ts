import { useQuery } from '@tanstack/react-query';
import { hasGooglePhoto } from '@shared/auth/session';

/** Read once from the ID token (D-108); undefined until it is read, so a form is not drawn before it knows. */
export function useHasGooglePhoto(): boolean | undefined {
  const { data, isPending } = useQuery({
    queryKey: ['google-photo'],
    queryFn: hasGooglePhoto,
    staleTime: Infinity,
  });
  return isPending ? undefined : (data ?? false);
}
