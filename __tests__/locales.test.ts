import { describe, expect, it } from 'vite-plus/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { LANGUAGES } from '../shared/constants/languages';

// I18N-01, R-19: every string is in a locale file per language with the same keys (D-85).
// Untranslated Latin text is not checked here.

type Code = (typeof LANGUAGES)[number]['code'];

// Language facts (CLDR plural categories), not repo limits.
const PLURAL_FORMS: Record<Code, string[]> = {
  he: ['one', 'two', 'other'],
  en: ['one', 'other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  ru: ['one', 'few', 'many', 'other'],
};

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const locales = LANGUAGES.map(({ code }) => {
  const url = new URL(`../frontend/public/locales/${code}.json`, import.meta.url);
  const parsed: unknown = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
  const entries = Object.entries(parsed as Record<string, unknown>);
  return { code, entries };
});

// A plain scan for {{name}}; a regex over user-facing text is flagged as super-linear.
const placeholdersOf = (text: unknown): string[] => {
  const names: string[] = [];
  if (typeof text !== 'string') return names;
  let from = 0;
  for (;;) {
    const open = text.indexOf('{{', from);
    if (open === -1) return names;
    const close = text.indexOf('}}', open + 2);
    if (close === -1) return names;
    const name = text.slice(open + 2, close).trim();
    if (name !== '') names.push(name);
    from = close + 2;
  }
};

// Maps a key to the name shared across languages (plural suffix removed) and collects
// its placeholders; plural forms of one base are merged because forms differ per language.
const normalise = (entries: [string, unknown][]) => {
  const bases = new Map<string, Set<string>>();
  for (const [key, text] of entries) {
    const base = key.replace(PLURAL_SUFFIX, '');
    const set = bases.get(base) ?? new Set<string>();
    placeholdersOf(text).forEach((p) => set.add(p));
    bases.set(base, set);
  }
  return bases;
};

describe('locale files', () => {
  it('cover every language in LANGUAGES with a flat object of strings', () => {
    expect(locales.length).toBeGreaterThan(0);
    for (const { code, entries } of locales) {
      expect(entries.length, code).toBeGreaterThan(0);
      for (const [key, text] of entries) {
        expect(typeof text, `${code}:${key}`).toBe('string');
      }
    }
  });

  it('have the same keys in every language', () => {
    const [first, ...rest] = locales;
    const expected = [...normalise(first.entries).keys()].sort();

    for (const { code, entries } of rest) {
      expect([...normalise(entries).keys()].sort(), `${code} vs ${first.code}`).toEqual(expected);
    }
  });

  it('have the same {{placeholder}} names for a key in every language', () => {
    const [first, ...rest] = locales;
    const expected = normalise(first.entries);

    for (const { code, entries } of rest) {
      const actual = normalise(entries);
      for (const [base, names] of expected) {
        expect([...(actual.get(base) ?? [])].sort(), `${code}:${base}`).toEqual([...names].sort());
      }
    }
  });

  it('have no empty or whitespace-only value', () => {
    const blank = locales.flatMap(({ code, entries }) =>
      entries
        .filter(([, text]) => typeof text !== 'string' || text.trim() === '')
        .map(([key]) => `${code}:${key}`)
    );

    expect(blank).toEqual([]);
  });

  it('give each plural key exactly the plural forms its language needs', () => {
    const wrong: string[] = [];
    for (const { code, entries } of locales) {
      const forms = new Map<string, string[]>();
      for (const [key] of entries) {
        const match = PLURAL_SUFFIX.exec(key);
        if (!match) continue;
        const base = key.replace(PLURAL_SUFFIX, '');
        forms.set(base, [...(forms.get(base) ?? []), match[1]]);
      }
      for (const [base, found] of forms) {
        if ([...found].sort().join() !== [...PLURAL_FORMS[code]].sort().join()) {
          wrong.push(`${code}:${base} has ${found.sort().join('/')}`);
        }
      }
    }

    expect(wrong).toEqual([]);
  });

  it('know the plural forms of every language in LANGUAGES', () => {
    expect(LANGUAGES.map(({ code }) => code).sort()).toEqual(Object.keys(PLURAL_FORMS).sort());
  });
});
