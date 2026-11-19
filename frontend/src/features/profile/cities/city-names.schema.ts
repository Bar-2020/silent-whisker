import { z } from 'zod';

/**
 * One file of place names per language (`names/<code>.json`, built by `scripts/build-cities.mjs`,
 * D-117): the place's code, its name in that language (the English one where the list has none),
 * its English name (so Latin letters find it in any language) and 1 for a better-known place.
 */
export const cityNamesSchema = z.array(
  z.tuple([z.number().int().positive(), z.string(), z.string(), z.number()])
);

/** A place as the screens use it. */
export interface CityName {
  readonly id: number;
  readonly name: string;
  readonly english: string;
  readonly isKnown: boolean;
}
