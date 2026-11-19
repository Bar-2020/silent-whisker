import type { CityName } from './city-name.types';

/** Lower case, without marks (Hebrew points, Arabic vowels, accents) or apostrophes, and a hyphen is a space: what a search compares. */
const normalizeForSearch = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’׳״]/gu, '')
    .replace(/[-\s]+/gu, ' ')
    .trim();

/** Orders well-known places before the others; places of the same kind keep their order. */
const wellKnownPlacesFirst = (a: CityName, b: CityName): number =>
  Number(!a.isWellKnown) - Number(!b.isWellKnown);

/**
 * The places that match what the member typed, in the app's language or in English: names that
 * start with it first, and among those the better-known places first (D-117).
 */
export function findMatchingCities(
  cities: readonly CityName[],
  typed: string,
  limit: number
): CityName[] {
  const query = normalizeForSearch(typed);
  if (query === '') return [];
  const starts: CityName[] = [];
  const contains: CityName[] = [];
  for (const city of cities) {
    const names = [normalizeForSearch(city.name), normalizeForSearch(city.english)];
    if (names.some((name) => name.startsWith(query))) starts.push(city);
    else if (names.some((name) => name.includes(query))) contains.push(city);
  }
  return [...starts.sort(wellKnownPlacesFirst), ...contains.sort(wellKnownPlacesFirst)].slice(
    0,
    limit
  );
}
