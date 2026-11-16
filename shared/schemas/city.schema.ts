import { z } from 'zod';

/**
 * One place of the list the member picks a city from (`shared/constants/cities.json`, built by
 * `scripts/build-cities.mjs`, D-117): the government's locality code, the name in each language
 * (Russian and one Arabic name are missing for some) and the place's position when it has one.
 */
const citySchema = z.object({
  id: z.number().int().positive(),
  he: z.string(),
  en: z.string(),
  ar: z.string().optional(),
  ru: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type City = z.infer<typeof citySchema>;

export const cityListSchema = z.array(citySchema);
