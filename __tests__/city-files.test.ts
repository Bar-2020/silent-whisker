import { describe, expect, it } from 'vite-plus/test';

import type { GovRecord } from '../shared/city-files';
import { buildCityFiles, checkCityFiles, titleCase } from '../shared/city-files';

/** PROF-33 and PROF-35, D-117: the city files built from the government's records, and the checks a new list must pass. */

const LANGUAGES = ['he', 'en', 'ar', 'ru'];

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

describe('the city files built from made-up records (PROF-33, D-117)', () => {
  const records = [
    record(30, 'ירושלים', 'JERUSALEM', 'أورشليم القدس', 'Иерусалим'),
    record(10, 'באר שבע', "BE'ER SHEVA", null, null),
    record(20, 'תל אביב - יפו', 'TEL AVIV - YAFO', 'تل أبيب – يافا', 'Тель-Авив Яффо'),
  ];

  // PROF-33, D-117
  it('makes one file of rows per language, in order of code, whatever the order of the records', () => {
    const files = buildCityFiles(records, LANGUAGES);

    expect(Object.keys(files).toSorted()).toEqual([...LANGUAGES].toSorted());
    for (const code of LANGUAGES) expect(codesOf(files[code])).toEqual([10, 20, 30]);
  });

  // PROF-33, D-117
  it('makes only the files of the languages asked for', () => {
    expect(Object.keys(buildCityFiles(records, ['he', 'en'])).toSorted()).toEqual(['en', 'he']);
  });

  // PROF-33, D-117
  it('gives each row the code, the name in that language, the English name in words and 0 or 1', () => {
    const files = buildCityFiles(records, LANGUAGES);

    expect(files.he).toEqual([
      [10, 'באר שבע', "Be'er Sheva", 0],
      [20, 'תל אביב - יפו', 'Tel Aviv - Yafo', 1],
      [30, 'ירושלים', 'Jerusalem', 1],
    ]);
    expect(files.ru).toEqual([
      [10, "Be'er Sheva", "Be'er Sheva", 0],
      [20, 'Тель-Авив Яффо', 'Tel Aviv - Yafo', 1],
      [30, 'Иерусалим', 'Jerusalem', 1],
    ]);
  });

  // PROF-33, D-117
  it('gives a language that has no name for a place the English name', () => {
    const files = buildCityFiles(records, LANGUAGES);

    expect(files.ar[0]).toEqual([10, "Be'er Sheva", "Be'er Sheva", 0]);
    expect(files.ar[1]).toEqual([20, 'تل أبيب – يافا', 'Tel Aviv - Yafo', 1]);
    expect(files.en.map((row) => row[1])).toEqual(["Be'er Sheva", 'Tel Aviv - Yafo', 'Jerusalem']);
  });

  // PROF-33, D-117
  it('marks with 1 exactly the places that have a Russian name, in every file', () => {
    const files = buildCityFiles(records, LANGUAGES);

    for (const code of LANGUAGES) expect(files[code].map((row) => row[3])).toEqual([0, 1, 1]);
  });

  // PROF-33, D-117
  it('trims padded names', () => {
    const files = buildCityFiles(
      [record(1, '  חיפה ', '  HAIFA\t', ' حيفا ', ' Хайфа  ')],
      LANGUAGES
    );

    expect(files.he).toEqual([[1, 'חיפה', 'Haifa', 1]]);
    expect(files.ar).toEqual([[1, 'حيفا', 'Haifa', 1]]);
    expect(files.ru).toEqual([[1, 'Хайфа', 'Haifa', 1]]);
    expect(files.en).toEqual([[1, 'Haifa', 'Haifa', 1]]);
  });

  // PROF-33, D-117
  it.each([
    ['no Hebrew name', record(5, null, 'NOWHERE')],
    ['no English name', record(5, 'ללא', null)],
    ['a code of 0', record(0, 'ללא', 'NOWHERE')],
    ['a negative code', record(-5, 'ללא', 'NOWHERE')],
    ['a code that is not whole', record(5.5, 'ללא', 'NOWHERE')],
  ])('leaves out a record with %s and keeps the others', (_name, bad) => {
    const files = buildCityFiles(
      [record(1, 'חיפה', 'HAIFA'), bad, record(2, 'עכו', 'AKKO')],
      LANGUAGES
    );

    for (const code of LANGUAGES) expect(codesOf(files[code])).toEqual([1, 2]);
  });

  // PROF-33, D-117
  it('makes empty files from no records', () => {
    const files = buildCityFiles([], LANGUAGES);

    for (const code of LANGUAGES) expect(files[code]).toEqual([]);
  });
});

describe('the checks a new city list must pass (PROF-35, D-117)', () => {
  const place = (code: number) => record(code, `מקום ${String(code)}`, `PLACE ${String(code)}`);
  const filesOf = (codes: number[]) => buildCityFiles(codes.map(place), LANGUAGES);

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
