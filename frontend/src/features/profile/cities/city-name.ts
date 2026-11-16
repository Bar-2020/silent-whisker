import { DEFAULT_LANGUAGE } from '@constants/languages';
import type { City } from '@schemas/city.schema';
import { languageSchema } from '@shared/i18n/language.schema';

type LanguageCode = ReturnType<typeof languageSchema.parse>;

// The list has no Russian name for most places and no Arabic one for one: those show the English name (D-117).
const NAME_IN: Record<LanguageCode, (city: City) => string> = {
  he: (city) => city.he,
  en: (city) => city.en,
  ar: (city) => city.ar ?? city.en,
  ru: (city) => city.ru ?? city.en,
};

/** The city's name in the language the app is showing. */
export const cityName = (city: City, language: string): string =>
  NAME_IN[languageSchema.catch(DEFAULT_LANGUAGE).parse(language)](city);

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
const byKnown = (a: City, b: City): number =>
  Number(a.ru === undefined) - Number(b.ru === undefined);

/**
 * The places that match what the member typed, in any of the four languages: names that start with
 * it first, and among those the better-known places first (D-117).
 */
export function matchCities(cities: readonly City[], typed: string, limit: number): City[] {
  const query = searchable(typed);
  if (query === '') return [];
  const starts: City[] = [];
  const contains: City[] = [];
  for (const city of cities) {
    const names = [city.he, city.en, city.ar, city.ru].filter((name) => name !== undefined);
    const found = names.map(searchable);
    if (found.some((name) => name.startsWith(query))) starts.push(city);
    else if (found.some((name) => name.includes(query))) contains.push(city);
  }
  return [...starts.sort(byKnown), ...contains.sort(byKnown)].slice(0, limit);
}
