import fixtureFile from './city-fixture.json';

/**
 * A small made-up city list for tests (D-117): the real list is not in the repo. The codes are made up too.
 * `tel` has more places that start with it than the box lists, some better-known (they have a Russian name) and some
 * not; some places have no Arabic or Russian name (the English one shows); some names carry an apostrophe or a hyphen;
 * one Arabic name starts with "تل" though its English name does not start with "Tel".
 */
export interface FixtureCity {
  id: number;
  he: string;
  en: string;
  ar?: string;
  ru?: string;
}

export type CityRow = [id: number, name: string, english: string, betterKnown: 0 | 1];

export const FIXTURE_CITIES: FixtureCity[] = fixtureFile;

export function fixtureCity(english: string): FixtureCity {
  const found = FIXTURE_CITIES.find((city) => city.en === english);
  if (found === undefined) throw new Error(`no fixture city ${english}`);
  return found;
}

/** The name the app shows for a place in a language: its name there, else the English one. */
export function fixtureName(city: FixtureCity, code: string): string {
  if (code === 'he') return city.he;
  if (code === 'ar') return city.ar ?? city.en;
  if (code === 'ru') return city.ru ?? city.en;
  return city.en;
}

/** What `cities/<code>.json` holds for the fixture: a row per place, the last number 1 for a place with a Russian name. */
export function fixtureRows(code: string): CityRow[] {
  return FIXTURE_CITIES.map((city) => [
    city.id,
    fixtureName(city, code),
    city.en,
    city.ru === undefined ? 0 : 1,
  ]);
}
