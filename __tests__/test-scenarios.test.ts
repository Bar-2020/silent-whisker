import { describe, expect, it } from 'vite-plus/test';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

/**
 * docs/TESTS-*.md is the plan for the tests of Phase 7 (D-89). A rule with no scenario is a rule
 * nobody planned to test, and a repeated id points a test at two cases, so both are checked
 * rather than trusted.
 */

const DOCS = resolve(__dirname, '..', 'docs');
const read = (file: string) => readFileSync(join(DOCS, file), 'utf8');

// Cells of every scenario row: ['', id, layer, do this, expect, rule, ''].
const rows = readdirSync(DOCS)
  .filter((f) => /^TESTS-.*\.md$/.test(f))
  .flatMap((f) => read(f).split('\n'))
  .filter((line) => /^\| [A-Z][A-Z0-9]*-\d+ \|/.test(line))
  .map((line) => line.split('|').map((cell) => cell.trim()));

// Unit, handler with a database, component, browser, deployed, Terraform, by hand.
const LAYERS = ['u', 'i', 'c', 'e', 'd', 't', 'm'];

describe('test scenarios', () => {
  it('give every rule at least one scenario', () => {
    const rules = [...read('RULES.md').matchAll(/^\| (R-\d+) \| (?!Replaced by)/gm)].map(
      ([, id]) => id
    );
    const cited = new Set(
      rows.flatMap((cells) => cells[cells.length - 2].match(/\bR-\d+\b/g) ?? [])
    );

    expect(rules.filter((id) => !cited.has(id))).toEqual([]);
  });

  it('use each id once, with a known layer', () => {
    const ids = rows.map((cells) => cells[1]);

    expect(rows.length).toBeGreaterThan(0);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(rows.filter((cells) => !LAYERS.includes(cells[2])).map((cells) => cells[1])).toEqual([]);
  });
});
