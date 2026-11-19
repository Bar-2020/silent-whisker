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

/**
 * The places that match what the member typed, in the app's language or in English: names that
 * start with it first, then the others. Each group keeps the file's order, better-known places first (D-117).
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
  return [...starts, ...contains].slice(0, limit);
}
