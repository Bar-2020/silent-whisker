import { describe, expect, it } from 'vite-plus/test';

import cityFile from '../constants/cities.json';
import { cityListSchema } from '../schemas/city.schema';
import expectations from './city-list-expectations.json';

// PROF-33, D-117: the list the member picks a city from, read as the file is committed.
// The bounds, the codes and the names to expect are in city-list-expectations.json, so no number sits in this file.

const { latitudeRange, longitudeRange, placesWithoutArabicName, wellKnownPlaces } = expectations;

const cities = cityListSchema.parse(cityFile);

const NAMES_OF_EACH_PLACE = cities.flatMap((city) =>
  (['he', 'en', 'ar', 'ru'] as const).flatMap((language) => {
    const name = city[language];
    return name === undefined ? [] : [{ id: city.id, language, name }];
  })
);

describe('the city list (PROF-33, D-117)', () => {
  it('parses with the city schema and is not empty', () => {
    expect(cityListSchema.safeParse(cityFile).success).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
  });

  it('gives every place a positive whole id, unique over the list', () => {
    for (const city of cities) {
      expect(Number.isInteger(city.id)).toBe(true);
      expect(city.id).toBeGreaterThan(0);
    }
    expect(new Set(cities.map((city) => city.id)).size).toBe(cities.length);
  });

  it('gives every place a Hebrew and an English name', () => {
    const lacking = cities.filter((city) => city.he.trim() === '' || city.en.trim() === '');
    expect(lacking.map((city) => city.id)).toEqual([]);
  });

  it('has no name, in any language, that is empty or padded with spaces', () => {
    const padded = NAMES_OF_EACH_PLACE.filter(({ name }) => name === '' || name !== name.trim());
    expect(padded).toEqual([]);
  });

  it('has an Arabic name for every place but the one the list lacks (Uzeir)', () => {
    const lacking = cities.filter((city) => city.ar === undefined).map((city) => city.id);
    expect(lacking).toEqual(placesWithoutArabicName);
  });

  it('keeps a position, when there is one, inside Israel', () => {
    for (const { id, lat, lng } of cities) {
      if (lat !== undefined) {
        expect(lat, `latitude of ${String(id)}`).toBeGreaterThanOrEqual(latitudeRange.min);
        expect(lat, `latitude of ${String(id)}`).toBeLessThanOrEqual(latitudeRange.max);
      }
      if (lng !== undefined) {
        expect(lng, `longitude of ${String(id)}`).toBeGreaterThanOrEqual(longitudeRange.min);
        expect(lng, `longitude of ${String(id)}`).toBeLessThanOrEqual(longitudeRange.max);
      }
    }
  });

  it.each(wellKnownPlaces)(
    'holds the well-known place $id ($en) with its names in all four languages',
    (place) => {
      expect(cities.find((city) => city.id === place.id)).toMatchObject(place);
    }
  );
});
