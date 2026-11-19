import { z } from 'zod';

/**
 * A city file, `cities/<code>.json` on the site, built by `scripts/build-cities.ts` (D-117): one row
 * per place with its code, its name in that language (the English one where the list has none) and
 * its English name (so Latin letters find it in any language). Better-known places come first.
 */
export const cityNamesSchema = z.array(
  z.tuple([z.number().int().positive(), z.string(), z.string()])
);

/** The codes of the places in the text of a city file; throws when the text is not rows of a city file. */
export const parseCityCodes = (text: string): Set<number> =>
  new Set(cityNamesSchema.parse(JSON.parse(text)).map(([code]) => code));
