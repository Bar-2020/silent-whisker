import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

const REPO_ROOT = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(REPO_ROOT, path), 'utf8');

describe('photo check prompt (D-50)', () => {
  it('is the same in the constants file and in the decision that records it', () => {
    const { prompt } = JSON.parse(read('shared/constants/photo-check.json')) as { prompt: string };
    const d50 = read('docs/DECISIONS.md')
      .split('\n')
      .find((line) => line.startsWith('| D-50 '));
    expect(d50).toContain(prompt);
  });
});
