import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CITY_SUGGESTIONS_LIMIT } from '@constants/profile';
import { cityListSchema } from '@schemas/city.schema';
import type { City } from '@schemas/city.schema';

/**
 * The city list read from its file with `fs`, not imported: a test that counts when the app loads the
 * list file (a mock of `@constants/cities.json`) must not load it itself (D-117).
 */
const thisFolder = dirname(fileURLToPath(import.meta.url));

export const CITIES: City[] = cityListSchema.parse(
  JSON.parse(readFileSync(resolve(thisFolder, '../../../../shared/constants/cities.json'), 'utf8'))
);

export const cityById = (id: number): City => {
  const found = CITIES.find((city) => city.id === id);
  if (found === undefined) throw new Error(`no city ${String(id)} on the list`);
  return found;
};

/** The name the app shows for a place: its name in the app's language, else the English one (D-117). */
export function shownName(city: City, code: string): string {
  if (code === 'he') return city.he;
  if (code === 'ar') return city.ar ?? city.en;
  if (code === 'ru') return city.ru ?? city.en;
  return city.en;
}

/** Case, Hebrew points and Arabic marks, hyphens, apostrophes (also geresh and gershayim) and extra spaces do not matter. */
const IGNORED = /[\p{M}'’‘`´ʼ׳"״]/gu;
/** A hyphen or a dash counts as a space. */
const DASHES = /[-‐-―־]/gu;
const normalize = (text: string): string =>
  text.toLowerCase().replace(IGNORED, '').replace(DASHES, ' ').replace(/\s+/gu, ' ').trim();

export interface Expected {
  /** Places that match through their name in the app's language or their English name. */
  matching: City[];
  /** Those among them with a name that starts with the text. */
  starting: City[];
  /** Every match in the order the box lists them (D-117): see `expectedFor`. */
  ranked: City[];
  /** The places the box lists: the first of `ranked`, no more than the limit. */
  listed: City[];
  /** How many options the box lists: no more than the limit. */
  count: number;
}

/** What the box must list for `typed`, worked out from the list file and the rule of FIRST-15 and D-117. */
export function expectedFor(typed: string, code: string): Expected {
  const wanted = normalize(typed);
  // Only the name in the app's language and the English name are compared (D-117), never the other two
  const namesOf = (city: City): string[] => [normalize(shownName(city, code)), normalize(city.en)];
  const matching = CITIES.filter((city) => namesOf(city).some((name) => name.includes(wanted)));
  const starting = matching.filter((city) => namesOf(city).some((name) => name.startsWith(wanted)));
  // Names that start with the text come before names that only contain it; in each group the places that
  // have a Russian name (the better-known ones) come first; inside each of those, the list's own order.
  const hasRussian = (city: City): boolean => city.ru !== undefined;
  const inGroup = (group: City[]): City[] => [
    ...group.filter((city) => hasRussian(city)),
    ...group.filter((city) => !hasRussian(city)),
  ];
  const containingOnly = matching.filter((city) => !starting.includes(city));
  const ranked = [...inGroup(starting), ...inGroup(containingOnly)];
  const listed = ranked.slice(0, CITY_SUGGESTIONS_LIMIT);
  return { matching, starting, ranked, listed, count: listed.length };
}
