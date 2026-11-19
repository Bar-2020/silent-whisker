import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { describe, expect, it } from 'vite-plus/test';

import cityFile from '../constants/cities.json';
import { cityListSchema } from '../schemas/city.schema';
import expectations from './city-list-expectations.json';

// PROF-35, D-117: the four small names files the app loads (one per language) against the full list the server uses

const LANGUAGES = ['he', 'en', 'ar', 'ru'] as const;

const thisFolder = dirname(fileURLToPath(import.meta.url));
const namesPath = (code: string): string =>
  resolve(thisFolder, '../../frontend/src/features/profile/cities/names', `${code}.json`);

/** [code, name in the language (English where the list has none), English name, 1 when the list has a Russian name] */
const rowSchema = z.tuple([
  z.number().int().positive(),
  z.string(),
  z.string(),
  z.union([z.literal(0), z.literal(1)]),
]);
const namesSchema = z.array(rowSchema);

const cities = cityListSchema.parse(cityFile);

const nameIn = (city: (typeof cities)[number], code: (typeof LANGUAGES)[number]): string =>
  city[code] ?? city.en;

describe.each(LANGUAGES)('the names file of %s (PROF-35, D-117)', (code) => {
  const rows = namesSchema.parse(JSON.parse(readFileSync(namesPath(code), 'utf8')));

  it('has rows of [code, name, English name, 0 or 1] only', () => {
    expect(namesSchema.safeParse(rows).success).toBe(true);
  });

  it('has one row per place of the full list, in the same order and with the same codes', () => {
    expect(rows.map(([id]) => id)).toEqual(cities.map((city) => city.id));
  });

  it('gives each place its name in the language, and the English name where the list has none', () => {
    expect(rows.map(([, name]) => name)).toEqual(cities.map((city) => nameIn(city, code)));
    for (const [id, name] of rows) expect(name.trim(), `name of ${String(id)}`).not.toBe('');
  });

  it('gives each place the English name of the full list', () => {
    expect(rows.map(([, , english]) => english)).toEqual(cities.map((city) => city.en));
  });

  it('marks with 1 exactly the places that have a Russian name in the full list', () => {
    expect(rows.map(([, , , russian]) => russian)).toEqual(
      cities.map((city) => (city.ru === undefined ? 0 : 1))
    );
  });

  it('is small enough for a phone to load', () => {
    expect(statSync(namesPath(code)).size).toBeLessThanOrEqual(expectations.maxNamesFileBytes);
  });
});
