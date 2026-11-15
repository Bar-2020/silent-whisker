import { useQuery } from '@tanstack/react-query';
import { hasGooglePhoto } from '@shared/auth/session';

/** Read once from the ID token (D-105); false until it is read. */
export function useHasGooglePhoto(): boolean {
  const { data } = useQuery({
    queryKey: ['google-photo'],
    queryFn: hasGooglePhoto,
    staleTime: Infinity,
  });
  return data ?? false;
}
