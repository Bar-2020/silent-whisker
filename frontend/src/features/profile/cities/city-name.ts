import type { CityName } from './city-name.types';

/** Lower case, without marks (Hebrew points, Arabic vowels, accents) or apostrophes, and a hyphen is a space: what a search compares. */
const searchable = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’׳״]/gu, '')
    .replace(/[-\s]+/gu, ' ')
    .trim();

// The list has no population. A Russian name exists for the better-known places, so those come first.
const byKnown = (a: CityName, b: CityName): number => Number(!a.isKnown) - Number(!b.isKnown);

/**
 * The places that match what the member typed, in the app's language or in English: names that
 * start with it first, and among those the better-known places first (D-117).
 */
export function matchCities(cities: readonly CityName[], typed: string, limit: number): CityName[] {
  const query = searchable(typed);
  if (query === '') return [];
  const starts: CityName[] = [];
  const contains: CityName[] = [];
  for (const city of cities) {
    const names = [searchable(city.name), searchable(city.english)];
    if (names.some((name) => name.startsWith(query))) starts.push(city);
    else if (names.some((name) => name.includes(query))) contains.push(city);
  }
  return [...starts.sort(byKnown), ...contains.sort(byKnown)].slice(0, limit);
}
