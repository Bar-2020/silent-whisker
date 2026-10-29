import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * A boundary zone whose pattern matches nothing only warns, so a typo in .fallowrc.json would
 * switch a rule off and nobody would see it. This lays out a project with one import across each
 * line the areas must not cross and asserts the real config refuses exactly those.
 */

const REPO_ROOT = resolve(__dirname, '..');
const CONFIG = join(REPO_ROOT, '.fallowrc.json');
const FALLOW = join(REPO_ROOT, 'node_modules/fallow/bin/fallow');

const FILES: Record<string, string> = {
  'shared/constants.ts': 'export const C = 1;',
  'backend/handler.ts': 'export const B = 1;',
  'frontend/src/screen.ts': "import { C } from '../../shared/constants';\nexport const S = C;",
  // Allowed: the areas meet in shared/, and tests may reach everything.
  '__tests__/all.test.ts':
    "import { B } from '../backend/handler';\nimport { S } from '../frontend/src/screen';\nexport const T = [B, S];",
  // Refused.
  'frontend/src/reads-backend.ts':
    "import { B } from '../../backend/handler';\nexport const R = B;",
  'backend/reads-frontend.ts': "import { S } from '../frontend/src/screen';\nexport const R = S;",
  'shared/reads-backend.ts': "import { B } from '../backend/handler';\nexport const R = B;",
  'infra/app/reads-shared.js':
    "import { C } from '../../shared/constants.js';\nexport const R = C;",
  // A new top-level folder with no zone.
  'newarea/orphan.ts': 'export const O = 1;',
};

interface Report {
  boundary_violations: { from_path: string; to_path: string }[];
  boundary_coverage_violations: { path: string }[];
}

function analyseFixture(): Report {
  const root = mkdtempSync(join(tmpdir(), 'fallow-config-'));
  try {
    writeFileSync(join(root, 'package.json'), '{"name":"fixture","private":true,"type":"module"}');
    writeFileSync(join(root, '.fallowrc.json'), readFileSync(CONFIG));
    for (const [path, source] of Object.entries(FILES)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), source);
    }
    // Exit code 1 is the expected "findings" outcome; anything else is a broken run.
    const run = spawnSync(
      process.execPath,
      [FALLOW, 'architecture', '--boundaries', '--no-type-aware', '--format', 'json', '--quiet'],
      { cwd: root, encoding: 'utf8' }
    );
    if (run.status !== 1) throw new Error(`fallow exited ${run.status}: ${run.stderr}`);
    return JSON.parse(run.stdout) as Report;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const report = analyseFixture();

describe('the architecture boundaries in .fallowrc.json', () => {
  it('refuse an import between the areas, and only those', () => {
    const refused = report.boundary_violations
      .map((v) => `${v.from_path} -> ${v.to_path}`)
      .sort((a, b) => a.localeCompare(b));
    expect(refused).toEqual([
      'backend/reads-frontend.ts -> frontend/src/screen.ts',
      'frontend/src/reads-backend.ts -> backend/handler.ts',
      'infra/app/reads-shared.js -> shared/constants.ts',
      'shared/reads-backend.ts -> backend/handler.ts',
    ]);
  });

  it('refuse a source file in a folder no zone covers', () => {
    expect(report.boundary_coverage_violations.map((v) => v.path)).toEqual(['newarea/orphan.ts']);
  });

  it('get a zone per feature as soon as frontend/src/features exists', () => {
    // Without autoDiscover a feature could import another one. Add the zones (see
    // .claude/instructions/extensibility.md) in the same change that creates the first feature.
    const needsZones = existsSync(join(REPO_ROOT, 'frontend/src/features'));
    const hasZones = readFileSync(CONFIG, 'utf8').includes('"autoDiscover"');
    expect({ needsZones, hasZones }).not.toEqual({ needsZones: true, hasZones: false });
  });
});
