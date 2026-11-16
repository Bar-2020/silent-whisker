import { useQuery } from '@tanstack/react-query';
import { cityListSchema } from '@schemas/city.schema';

/** The list of places, loaded the first time a screen needs it, so the rest of the app does not carry it (D-117). */
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => cityListSchema.parse((await import('@constants/cities.json')).default),
    staleTime: Infinity,
  });
}
