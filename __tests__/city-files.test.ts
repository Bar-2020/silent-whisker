import { describe, expect, it } from 'vite-plus/test';

import { LANGUAGES } from '../shared/constants/languages';
import type { GovRecord } from '../shared/city-files';
import { buildCityFiles, checkCityFiles } from '../shared/city-files';
import { titleCase, trimOrNull } from '../shared/text';
import { cityNamesSchema } from '../shared/schemas/city-names.schema';
import { FIXTURE_CITIES, fixtureRows } from '../shared/__tests__/city-fixture';

/** PROF-33 and PROF-35, D-117: the city files built from the government's records, and the checks a new list must pass. */

const CODES = LANGUAGES.map(({ code }) => code);

/** A made-up government record; a missing name is null. */
function record(
  symbol_number: number,
  name_in_hebrew: string | null,
  name_in_english: string | null,
  name_in_arabic: string | null = null,
  name_in_russian: string | null = null
): GovRecord {
  return { symbol_number, name_in_hebrew, name_in_english, name_in_arabic, name_in_russian };
}

const codesOf = (rows: readonly (readonly unknown[])[]): unknown[] => rows.map((row) => row[0]);

describe('the English name in words (PROF-33, D-117)', () => {
  // PROF-33, D-117
  it.each([
    ["BE'ER SHEVA", "Be'er Sheva"],
    ['TEL AVIV - YAFO', 'Tel Aviv - Yafo'],
    ["MA'ALOT-TARSHIHA", "Ma'alot-Tarshiha"],
    ['ABU GHOSH', 'Abu Ghosh'],
    ['HAIFA', 'Haifa'],
    ['SHEVET (TRIBE) OF DAN', 'Shevet (Tribe) Of Dan'],
  ])('turns %s into %s', (capitals, words) => {
    expect(titleCase(capitals)).toBe(words);
  });
});

describe('a name trimmed, or none (PROF-33, D-117)', () => {
  // PROF-33, D-117
  it.each([
    [' חיפה ', 'חיפה'],
    ['  HAIFA\t', 'HAIFA'],
    ['Tel  Aviv', 'Tel  Aviv'],
    ['x', 'x'],
  ])('trims %j to %j', (padded, trimmed) => {
    expect(trimOrNull(padded)).toBe(trimmed);
  });

  // PROF-33, D-117
  it.each([[null], [''], ['   '], ['\t\n ']])('gives null for %j', (nothing) => {
    expect(trimOrNull(nothing)).toBeNull();
  });
});

describe('the city files built from made-up records (PROF-33, D-117)', () => {
  const records = [
    record(30, 'ירושלים', 'JERUSALEM', 'أورشليم القدس', 'Иерусалим'),
    record(10, 'באר שבע', "BE'ER SHEVA", null, null),
    record(20, 'תל אביב - יפו', 'TEL AVIV - YAFO', 'تل أبيب – يافا', 'Тель-Авив Яффо'),
  ];

  // PROF-33, D-117
  it('makes one file of rows per language, he, en, ar and ru, all in the same order', () => {
    const files = buildCityFiles(records);

    expect(Object.keys(files).toSorted()).toEqual(['ar', 'en', 'he', 'ru']);
    // the places with a Russian name (20, 30) first, then the other (10)
    for (const code of CODES) expect(codesOf(files[code])).toEqual([20, 30, 10]);
  });

  // PROF-33, D-117
  it('gives each row the code, the name in that language and the English name in words, the better-known first', () => {
    const files = buildCityFiles(records);

    expect(files.he).toEqual([
      [20, 'תל אביב - יפו', 'Tel Aviv - Yafo'],
      [30, 'ירושלים', 'Jerusalem'],
      [10, 'באר שבע', "Be'er Sheva"],
    ]);
    expect(files.ru).toEqual([
      [20, 'Тель-Авив Яффо', 'Tel Aviv - Yafo'],
      [30, 'Иерусалим', 'Jerusalem'],
      [10, "Be'er Sheva", "Be'er Sheva"],
    ]);
  });

  // PROF-33, D-117
  it('gives a language that has no name for a place the English name', () => {
    const files = buildCityFiles(records);

    expect(files.ar).toEqual([
      [20, 'تل أبيب – يافا', 'Tel Aviv - Yafo'],
      [30, 'أورشليم القدس', 'Jerusalem'],
      [10, "Be'er Sheva", "Be'er Sheva"],
    ]);
    expect(files.en.map((row) => row[1])).toEqual(['Tel Aviv - Yafo', 'Jerusalem', "Be'er Sheva"]);
  });

  // PROF-33, D-117
  it('has rows of three items that the city file schema accepts, in every file', () => {
    const files = buildCityFiles(records);

    for (const code of CODES) {
      expect(() => cityNamesSchema.parse(files[code])).not.toThrow();
      for (const row of files[code]) expect(row).toHaveLength(3);
    }
  });

  // PROF-33, D-117
  it('puts each group in order of code, whatever the order of the records', () => {
    const files = buildCityFiles([
      record(7, 'ז', 'SEVEN', null, 'Семь'),
      record(3, 'ג', 'THREE'),
      record(9, 'ט', 'NINE', null, 'Девять'),
      record(1, 'א', 'ONE'),
      record(5, 'ה', 'FIVE', 'خمسة', 'Пять'),
    ]);

    for (const code of CODES) expect(codesOf(files[code])).toEqual([5, 7, 9, 1, 3]);
  });

  // PROF-33, D-117
  it('counts a place as better known only for a Russian name that is there', () => {
    const files = buildCityFiles([
      record(1, 'א', 'ONE', 'واحد', ''),
      record(2, 'ב', 'TWO', null, '   '),
      record(3, 'ג', 'THREE', null, 'Три'),
    ]);

    for (const code of CODES) expect(codesOf(files[code])).toEqual([3, 1, 2]);
    // a Russian name of spaces is no name: the English one shows
    expect(files.ru).toEqual([
      [3, 'Три', 'Three'],
      [1, 'One', 'One'],
      [2, 'Two', 'Two'],
    ]);
  });

  // PROF-33, D-117
  it('trims padded names', () => {
    const files = buildCityFiles([record(1, '  חיפה ', '  HAIFA\t', ' حيفا ', ' Хайфа  ')]);

    expect(files.he).toEqual([[1, 'חיפה', 'Haifa']]);
    expect(files.ar).toEqual([[1, 'حيفا', 'Haifa']]);
    expect(files.ru).toEqual([[1, 'Хайфа', 'Haifa']]);
    expect(files.en).toEqual([[1, 'Haifa', 'Haifa']]);
  });

  // PROF-33, D-117
  it.each([
    ['no Hebrew name', record(5, null, 'NOWHERE')],
    ['no English name', record(5, 'ללא', null)],
    ['a code of 0', record(0, 'ללא', 'NOWHERE')],
    ['a negative code', record(-5, 'ללא', 'NOWHERE')],
    ['a code that is not whole', record(5.5, 'ללא', 'NOWHERE')],
    ['a bad code, though it has a Russian name', record(-1, 'ללא', 'NOWHERE', null, 'Нигде')],
  ])('leaves out a record with %s and keeps the others', (_name, bad) => {
    const files = buildCityFiles([record(1, 'חיפה', 'HAIFA'), bad, record(2, 'עכו', 'AKKO')]);

    for (const code of CODES) expect(codesOf(files[code])).toEqual([1, 2]);
  });

  // PROF-33, D-117
  it('makes empty files from no records', () => {
    const files = buildCityFiles([]);

    for (const code of CODES) expect(files[code]).toEqual([]);
  });
});

describe('the made-up city list of the tests follows the same rows (PROF-33, D-117)', () => {
  // PROF-33, D-117: the fixture the app and the handlers are tested with has the shape and the order of a real file
  it.each(CODES)('has rows the city file schema accepts, of three items, in %s', (code) => {
    const rows = fixtureRows(code);

    expect(() => cityNamesSchema.parse(rows)).not.toThrow();
    expect(rows).toHaveLength(FIXTURE_CITIES.length);
    for (const row of rows) expect(row).toHaveLength(3);
  });

  // PROF-33, D-117
  it('lists the places with a Russian name first and the others after, each in order of code, in every language', () => {
    // 109 Tel Ashqelon, 110 Tel Hai, 111 Tel Aviv - Yafo, 114 Shaar Tel, then 201 Haifa ...
    const firstCodes = [109, 110, 111, 114, 201, 202, 203];
    // the others, from 101 Tel Mond on, come after the last place with a Russian name (224 Hod HaSharon)
    const lastBetterKnown = 224;
    for (const code of CODES) {
      const codes = fixtureRows(code).map(([place]) => place);
      expect(codes.slice(0, firstCodes.length)).toEqual(firstCodes);
      expect(codes.at(codes.indexOf(lastBetterKnown) + 1)).toBe(101);
      expect(codes).toEqual(fixtureRows('en').map(([place]) => place));
    }
  });
});

describe('the checks a new city list must pass (PROF-35, D-117)', () => {
  const place = (code: number) => record(code, `מקום ${String(code)}`, `PLACE ${String(code)}`);
  const filesOf = (codes: number[]) => buildCityFiles(codes.map(place));

  // PROF-35, D-117
  it('throws for fewer places than the minimum, naming the count and the minimum', () => {
    const minimum = 1000;

    expect(() => {
      checkCityFiles(filesOf([1, 2, 3, 4, 5]), new Set<number>(), minimum);
    }).toThrow(new Error('The new list has 5 places, fewer than 1000'));
  });

  // PROF-35, D-117
  it('passes a list of exactly the minimum, and throws for one place fewer', () => {
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3]), new Set<number>(), 3);
    }).not.toThrow();
    expect(() => {
      checkCityFiles(filesOf([1, 2]), new Set<number>(), 3);
    }).toThrow('The new list has 2 places, fewer than 3');
  });

  // PROF-35, D-117
  it('throws when a code of the list on the site is missing from the new one, naming them', () => {
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3]), new Set([1, 7, 9]), 1);
    }).toThrow(new Error('The new list lacks 2 codes of the list on the site: 7, 9'));
  });

  // PROF-35, D-117
  it('names a single missing code too', () => {
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3]), new Set([1, 7]), 1);
    }).toThrow(/lacks 1 codes? of the list on the site: 7$/);
  });

  // PROF-35, D-117
  it('passes a list with every old code and more', () => {
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3, 4, 5]), new Set([1, 2, 3]), 3);
    }).not.toThrow();
  });

  // PROF-35, D-117
  it('passes a list that is the same as the one on the site, and a first list with no old codes', () => {
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3]), new Set([1, 2, 3]), 3);
    }).not.toThrow();
    expect(() => {
      checkCityFiles(filesOf([1, 2, 3]), new Set<number>(), 3);
    }).not.toThrow();
  });
});
