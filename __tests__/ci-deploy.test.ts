import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * The `deploy` job installs and builds nothing, so no dependency's code runs beside the AWS key: it
 * downloads the build the `verify` job uploaded (INFRA-08, D-02). Reads the workflow as text and
 * cuts a job out by indentation. Failures print step numbers, never a line of the workflow.
 */

const WORKFLOW = readFileSync(resolve(__dirname, '../.github/workflows/ci.yml'), 'utf8');
const PACKAGE_TOOL = /(?<![\w-])(?:npm|npx|pnpm|yarn|vp)(?![\w-])/;

const indent = (line: string) => line.length - line.trimStart().length;

/** The lines of one job under `jobs:`, up to the next line at or left of its key. */
function jobOf(yaml: string, name: string): string[] {
  const lines = yaml.split('\n');
  const jobs = lines.findIndex((line) => line.startsWith('jobs:'));
  const key = new RegExp(`^\\s+${name}:\\s*(?:#.*)?$`);
  const start = lines.findIndex((line, i) => i > jobs && key.test(line));
  if (start < 0) return [];
  const end = lines.findIndex(
    (line, i) =>
      i > start && /\S/.test(line) && !/^\s*#/.test(line) && indent(line) <= indent(lines[start])
  );
  return lines.slice(start, end < 0 ? undefined : end);
}

/** Each `- ...` item at the level of the first one under `steps:`, as its own text. */
function stepsOf(job: string[]): string[] {
  const after = job.slice(job.findIndex((line) => /^\s*steps:\s*$/.test(line)) + 1);
  const isItem = (line: string) => /^\s*-\s/.test(line);
  const top = Math.min(...after.filter(isItem).map(indent));
  const starts = after.flatMap((line, i) => (isItem(line) && indent(line) === top ? [i] : []));
  return starts.map((from, n) => after.slice(from, starts[n + 1]).join('\n'));
}

/** A step line without its indentation and without the list dash that opens the step. */
const bare = (line: string) => {
  const trimmed = line.trim();
  return trimmed.startsWith('- ') ? trimmed.slice(2).trim() : trimmed;
};
const lineOf = (step: string, key: string) =>
  step
    .split('\n')
    .map(bare)
    .find((line) => line.startsWith(`${key}:`));

const usesOf = (step: string) => {
  const value = lineOf(step, 'uses')?.slice('uses:'.length).trim() ?? '';
  return value.split(/\s/)[0] ?? '';
};
const usesAction = (name: string) => (step: string) => usesOf(step).includes(name);
const runsPackageTool = (step: string) =>
  lineOf(step, 'run') !== undefined &&
  PACKAGE_TOOL.test(
    step
      .split('\n')
      .map(bare)
      .filter((line) => !line.startsWith('name:') && !line.startsWith('#'))
      .join('\n')
  );

const deploy = stepsOf(jobOf(WORKFLOW, 'deploy'));
const verify = stepsOf(jobOf(WORKFLOW, 'verify'));

describe('the deploy job (INFRA-08, D-02)', () => {
  // INFRA-08, D-02
  it('finds the deploy and verify jobs with their steps', () => {
    expect(deploy.length).toBeGreaterThan(0);
    expect(verify.length).toBeGreaterThan(0);
  });

  // INFRA-08, D-02
  it('has no step that runs npm or vp', () => {
    expect(deploy.flatMap((step, i) => (runsPackageTool(step) ? [i + 1] : []))).toEqual([]);
  });

  // INFRA-08, D-02
  it('has no Vite+ setup action', () => {
    expect(deploy.flatMap((step, i) => (usesAction('setup-vp')(step) ? [i + 1] : []))).toEqual([]);
  });

  // INFRA-08, D-02
  it('downloads the build artifact before it configures the AWS credentials', () => {
    const download = deploy.findIndex(usesAction('download-artifact'));
    const credentials = deploy.findIndex(usesAction('configure-aws-credentials'));
    expect(download).toBeGreaterThan(-1);
    expect(credentials).toBeGreaterThan(-1);
    expect(download).toBeLessThan(credentials);
  });

  // INFRA-08, D-02
  it('is fed by a verify job that uploads the build artifact', () => {
    expect(verify.some(usesAction('upload-artifact'))).toBe(true);
  });
});

describe('the reading of a workflow (INFRA-08, D-02)', () => {
  const clean = [
    'jobs:',
    '  verify:',
    '    steps:',
    '      - run: npm run build',
    '  deploy:',
    '    needs: verify',
    '    steps:',
    '      - uses: actions/download-artifact@abc123 # v4',
    '      - uses: aws-actions/configure-aws-credentials@def456',
    '      - name: Apply what npm run build made',
    '        run: terraform apply',
    '  notify:',
    '    steps:',
    '      - run: npm test',
  ];
  const deployOf = (lines: string[]) => stepsOf(jobOf(lines.join('\n'), 'deploy'));

  // INFRA-08, D-02
  it('cuts the deploy job by indentation and does not flag a neighbour job or a step name', () => {
    expect(deployOf(clean)).toHaveLength(3);
    expect(deployOf(clean).some(runsPackageTool)).toBe(false);
  });

  // INFRA-08, D-02
  it.each([
    ['a one-line run step', '      - run: npm run build'],
    ['a run block', '      - name: Build\n        run: |\n          npm run build'],
    ['a vp step', '      - run: vp build'],
  ])('flags %s added to the deploy job', (_label, step) => {
    const end = clean.indexOf('  notify:');
    const added = [...clean.slice(0, end), ...step.split('\n'), ...clean.slice(end)];
    expect(deployOf(added).some(runsPackageTool)).toBe(true);
  });
});
