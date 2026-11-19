import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { CITY_SUGGESTIONS_LIMIT } from '@constants/profile';

/**
 * The made-up city list the tests use (`shared/__tests__/city-fixture.json`, D-117): the real list is not in
 * the repo, the app fetches a file per language. Read with `fs`, so the files the app is given and what a test
 * expects come from one source that no app code reads.
 */
const citySchema = z.object({
  id: z.number().int().positive(),
  he: z.string(),
  en: z.string(),
  ar: z.string().optional(),
  ru: z.string().optional(),
});
export type City = z.infer<typeof citySchema>;

const thisFolder = dirname(fileURLToPath(import.meta.url));

export const CITIES: City[] = z
  .array(citySchema)
  .parse(
    JSON.parse(
      readFileSync(resolve(thisFolder, '../../../../shared/__tests__/city-fixture.json'), 'utf8')
    )
  );

export const cityById = (id: number): City => {
  const found = CITIES.find((city) => city.id === id);
  if (found === undefined) throw new Error(`no city ${String(id)} on the list`);
  return found;
};

/** A place by its English name. */
export const cityNamed = (english: string): City => {
  const found = CITIES.find((city) => city.en === english);
  if (found === undefined) throw new Error(`no city ${english} on the list`);
  return found;
};

/** The name the app shows for a place: its name in the app's language, else the English one (D-117). */
export function shownName(city: City, code: string): string {
  if (code === 'he') return city.he;
  if (code === 'ar') return city.ar ?? city.en;
  if (code === 'ru') return city.ru ?? city.en;
  return city.en;
}

/** What `/cities/<code>.json` holds: a row [code, name, English name, 1 for a place with a Russian name, else 0] per place. */
export const rowsFor = (code: string): [number, string, string, number][] =>
  CITIES.map((city) => [city.id, shownName(city, code), city.en, city.ru === undefined ? 0 : 1]);

/** Case, Hebrew points and Arabic marks, apostrophes (also geresh and gershayim) and extra spaces do not matter; a hyphen is a space. */
const IGNORED = /[\p{M}'’‘`´ʼ׳"״]/gu;
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

/** What the box must list for `typed` in the app language `code`, worked out from the list and the rule of FIRST-15 and D-117. */
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
