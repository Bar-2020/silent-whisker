// The pure part of the city list build, shared by the monthly job and `scripts/build-cities.ts` (D-117): government records in, one file of rows per language
// out, and the checks a new list must pass before it replaces the one on the site. No imports, so
// Node runs it as it is and the tests import it too.

/** One record of the government's "Localities and countries" list (data.gov.il), the fields used. */
export interface GovRecord {
  readonly symbol_number: number;
  readonly name_in_hebrew: string | null;
  readonly name_in_english: string | null;
  readonly name_in_arabic: string | null;
  readonly name_in_russian: string | null;
}

/** [code, name in the file's language (the English one where the list has none), English name, 1 for a better-known place]. */
export type CityRow = readonly [number, string, string, 0 | 1];

interface Place {
  readonly id: number;
  readonly english: string;
  readonly known: 0 | 1;
  readonly names: Readonly<Record<string, string | undefined>>;
}

const clean = (text: string | null): string | undefined => {
  const trimmed = text?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

/** The list writes English names in capitals: "BE'ER SHEVA" becomes "Be'er Sheva". */
export const titleCase = (text: string): string =>
  text
    .toLowerCase()
    .replace(
      /(^|[ \-(])([a-z])/g,
      (_, before: string, letter: string) => before + letter.toUpperCase()
    );

/**
 * One file of rows per language, in the order of the codes. A place needs a code, a Hebrew and an
 * English name to be listed. Better-known places are the ones the list gives a Russian name.
 */
export function buildCityFiles(
  records: readonly GovRecord[],
  languages: readonly string[]
): Record<string, CityRow[]> {
  const places: Place[] = records
    .flatMap((record) => {
      const hebrew = clean(record.name_in_hebrew);
      const english = clean(record.name_in_english);
      if (!Number.isInteger(record.symbol_number) || record.symbol_number <= 0) return [];
      if (hebrew === undefined || english === undefined) return [];
      const russian = clean(record.name_in_russian);
      const place: Place = {
        id: record.symbol_number,
        english: titleCase(english),
        known: russian === undefined ? 0 : 1,
        names: {
          he: hebrew,
          en: titleCase(english),
          ar: clean(record.name_in_arabic),
          ru: russian,
        },
      };
      return [place];
    })
    .sort((a, b) => a.id - b.id);
  return Object.fromEntries(
    languages.map((language) => [
      language,
      places.map((place): CityRow => [
        place.id,
        place.names[language] ?? place.english,
        place.english,
        place.known,
      ]),
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
