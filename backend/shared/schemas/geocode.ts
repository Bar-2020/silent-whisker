import { z } from 'zod';

/** One row of the `geocode_cache` table (docs/DATA.md). */
const geocodeCacheRowSchema = z.object({
  query: z.string(),
  lat: z.number(),
  lng: z.number(),
  place: z.string(),
});

/** What a lookup returns: the row without its key. */
export const placeSchema = geocodeCacheRowSchema.omit({ query: true });
export type Place = z.infer<typeof placeSchema>;

/** Nominatim writes its coordinates as text; an empty or non-numeric one is no point. */
const coordinate = z.string().min(1).pipe(z.coerce.number());

/** The first hit of a Nominatim answer, as a `Place`. */
export const nominatimHitSchema = z
  .object({ lat: coordinate, lon: coordinate, display_name: z.string().min(1) })
  .transform(({ lat, lon, display_name }): Place => ({ lat, lng: lon, place: display_name }));

export const nominatimAnswerSchema = z.array(z.unknown());
