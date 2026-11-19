// The pure part of the city list build, shared by the monthly job and `scripts/build-cities.ts` (D-117):
// government records in, one file of rows per language out, and the checks a new list must pass
// before it replaces the one on the site. Imports carry their `.ts` extension so Node runs it as it is.
import { LANGUAGES } from './constants/languages.ts';
import type { LanguageCode } from './constants/languages.ts';
import { titleCase, trimOrNull } from './text.ts';

/** One record of the government's "Localities and countries" list (data.gov.il), the fields used. */
export interface GovRecord {
  readonly symbol_number: number;
  readonly name_in_hebrew: string | null;
  readonly name_in_english: string | null;
  readonly name_in_arabic: string | null;
  readonly name_in_russian: string | null;
}

/** [code, name in the file's language (the English one where the list has none), English name]. */
export type CityRow = readonly [number, string, string];

interface Place {
  readonly code: number;
  readonly hebrewName: string;
  readonly englishName: string;
  readonly arabicName: string | null;
  readonly russianName: string | null;
}

const NAME_IN: Record<LanguageCode, (place: Place) => string> = {
  he: (place) => place.hebrewName,
  en: (place) => place.englishName,
  ar: (place) => place.arabicName ?? place.englishName,
  ru: (place) => place.russianName ?? place.englishName,
};

/** A place needs a code, a Hebrew and an English name to be listed. */
function toPlace(record: GovRecord): Place | null {
  const hebrewName = trimOrNull(record.name_in_hebrew);
  const englishName = trimOrNull(record.name_in_english);
  const hasCode = Number.isInteger(record.symbol_number) && record.symbol_number > 0;
  if (!hasCode || hebrewName === null || englishName === null) return null;
  return {
    code: record.symbol_number,
    hebrewName,
    englishName: titleCase(englishName),
    arabicName: trimOrNull(record.name_in_arabic),
    russianName: trimOrNull(record.name_in_russian),
  };
}

/**
 * Better-known places first, then by code. The list has no population, so a place with a Russian
 * name counts as better known: typing "tel" lists Tel Aviv - Yafo before the small villages. Every
 * file has the same order, and the app keeps it.
 */
const betterKnownFirst = (a: Place, b: Place): number => {
  const byRussianName = Number(b.russianName !== null) - Number(a.russianName !== null);
  return byRussianName === 0 ? a.code - b.code : byRussianName;
};

/** One file of rows per language, all in the same order (see `betterKnownFirst`). */
export function buildCityFiles(records: readonly GovRecord[]): Record<string, CityRow[]> {
  const places = records
    .map(toPlace)
    .filter((place): place is Place => place !== null)
    .sort(betterKnownFirst);
  return Object.fromEntries(
    LANGUAGES.map(({ code }) => [
      code,
      places.map((place): CityRow => [place.code, NAME_IN[code](place), place.englishName]),
    ])
  );
}

/**
 * A new list replaces the one on the site only if it is plausible: enough places, and every code of
 * the list it replaces still there (codes are never removed, D-117).
 */
export function checkCityFiles(
  files: Readonly<Record<string, readonly CityRow[]>>,
  currentCodes: ReadonlySet<number>,
  minPlaces: number
): void {
  const first = Object.values(files).at(0);
  if (first === undefined || first.length < minPlaces) {
    throw new Error(`The new list has ${first?.length ?? 0} places, fewer than ${minPlaces}`);
  }
  const codes = first.map(([code]) => code);
  const missing = [...currentCodes].filter((code) => !codes.includes(code));
  if (missing.length > 0) {
    throw new Error(
      `The new list lacks ${missing.length} codes of the list on the site: ${missing.join(', ')}`
    );
  }
}

/** The text of one city file: a row on each line. */
export const cityFileText = (rows: readonly CityRow[]): string =>
  ['[', rows.map((row) => `  ${JSON.stringify(row)}`).join(',\n'), ']', ''].join('\n');
