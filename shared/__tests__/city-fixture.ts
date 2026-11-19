import fixtureFile from './city-fixture.json';

/**
 * The one small made-up city list the tests use (D-117): the real list is not in the repo. The codes are made up too.
 * `tel` has more places that start with it than the box lists, some better-known (they have a Russian name) and some
 * not; some places have no Arabic or Russian name (the English one shows); some names carry an apostrophe or a hyphen;
 * one Arabic name starts with "تل" though its English name does not start with "Tel".
 * Only data comes out of here: what a city file holds and the name shown in a language. What the box lists for a typed
 * text is written out in the tests, never worked out from this list.
 */
export interface FixtureCity {
  id: number;
  he: string;
  en: string;
  ar?: string;
  ru?: string;
}

export type CityRow = [id: number, name: string, english: string];

export const FIXTURE_CITIES: FixtureCity[] = fixtureFile;

export function fixtureCity(english: string): FixtureCity {
  const found = FIXTURE_CITIES.find((city) => city.en === english);
  if (found === undefined) throw new Error(`no fixture city ${english}`);
  return found;
}

/** The name a city file holds for a place in a language: its name there, else the English one (D-117). */
export function fixtureName(city: FixtureCity, code: string): string {
  if (code === 'he') return city.he;
  if (code === 'ar') return city.ar ?? city.en;
  if (code === 'ru') return city.ru ?? city.en;
  return city.en;
}

/**
 * What `cities/<code>.json` holds for the fixture (PROF-33, D-117): a row [code, name, English name] per place, the
 * better-known places (those with a Russian name) first, then the others, each group in order of code; the same
 * order in every language.
 */
export function fixtureRows(code: string): CityRow[] {
  const inCodeOrder = FIXTURE_CITIES.toSorted((a, b) => a.id - b.id);
  const betterKnown = inCodeOrder.filter((city) => city.ru !== undefined);
  const others = inCodeOrder.filter((city) => city.ru === undefined);
  return [...betterKnown, ...others].map((city) => [city.id, fixtureName(city, code), city.en]);
}
