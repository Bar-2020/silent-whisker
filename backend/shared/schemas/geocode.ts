import { z } from 'zod';

/** A `geocode_cache` row without its key (docs/DATA.md), and what the lookup returns. */
export const placeSchema = z.object({ lat: z.number(), lng: z.number(), place: z.string() });
export type Place = z.infer<typeof placeSchema>;

/** Nominatim writes its coordinates as text; an empty or non-numeric one is no point. */
const coordinate = z.string().min(1).pipe(z.coerce.number());

/** The first hit of a Nominatim answer, as a `Place`. */
export const nominatimHitSchema = z
  .object({ lat: coordinate, lon: coordinate, display_name: z.string().min(1) })
  .transform(({ lat, lon, display_name }): Place => ({ lat, lng: lon, place: display_name }));

export const nominatimAnswerSchema = z.array(z.unknown());
