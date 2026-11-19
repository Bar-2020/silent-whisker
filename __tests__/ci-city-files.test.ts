import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

import { CITY_FILES_FOLDER } from '../shared/constants/cities';

/**
 * INFRA-10, D-117: the deploy syncs the build to the site's bucket with `--delete`, which would remove the
 * city files that `npm run cities:upload` put there. Reads the workflow as text; failures print the number
 * of the command, never a line of the workflow.
 */

const WORKFLOW = readFileSync(resolve(__dirname, '../.github/workflows/ci.yml'), 'utf8');

const indent = (line: string) => line.length - line.trimStart().length;

/** The lines of the `deploy` job: from its key to the next line at or left of it. */
function deployJob(yaml: string): string[] {
  const lines = yaml.split('\n');
  const jobs = lines.findIndex((line) => line.startsWith('jobs:'));
  const start = lines.findIndex((line, i) => i > jobs && /^\s+deploy:\s*(?:#.*)?$/.test(line));
  if (start < 0) return [];
  const end = lines.findIndex(
    (line, i) =>
      i > start && /\S/.test(line) && !/^\s*#/.test(line) && indent(line) <= indent(lines[start])
  );
  return lines.slice(start, end < 0 ? undefined : end);
}

/** Every `s3 sync` command of a job as one line: a command continued with a backslash is joined. */
function syncCommands(job: string[]): string[] {
  return job
    .join('\n')
    .replace(/\\\r?\n\s*/g, ' ')
    .split('\n')
    .filter((line) => /\bs3\s+sync\b/.test(line) && !line.trimStart().startsWith('#'));
}

const BUILD_FOLDER = 'frontend/dist';

const EXCLUDES_CITY_FILES = new RegExp(`--exclude\\s+["']?${CITY_FILES_FOLDER}/\\*["']?(?=\\s|$)`);

describe('the deploy leaves the city files alone (INFRA-10, D-117)', () => {
  const syncs = syncCommands(deployJob(WORKFLOW));
  // The sync of the build to the site's bucket that removes old files; the design mocks' sync goes to another bucket
  const deleting = syncs.filter(
    (command) => command.includes('--delete') && command.includes(BUILD_FOLDER)
  );

  // INFRA-10, D-117
  it('has a sync of the build that removes old files, in the deploy job', () => {
    expect(syncs.length).toBeGreaterThan(0);
    expect(deleting.length).toBeGreaterThan(0);
  });

  // INFRA-10, D-117
  it('excludes cities/* in the sync of the build that removes old files', () => {
    // a failure names the command by its number and the S3 address it syncs to, never a whole line
    const without = deleting.flatMap((command, i) =>
      EXCLUDES_CITY_FILES.test(command)
        ? []
        : [`${String(i + 1)}: ${command.match(/s3:\/\/\S+/g)?.join(' ') ?? 'no s3 address'}`]
    );
    expect(without).toEqual([]);
  });
});

describe('the reading of a sync command (INFRA-10, D-117)', () => {
  const syncOf = (text: string) => syncCommands(text.split('\n'));
  const safe = [
    'aws s3 sync dist s3://$BUCKET --delete --exclude "cities/*" \\',
    '  --cache-control "x"',
  ].join('\n');

  // INFRA-10, D-117
  it.each([
    ['one line', 'aws s3 sync dist s3://b --delete --exclude "cities/*"'],
    ['a continued command', safe],
    ['single quotes', "aws s3 sync dist s3://b --delete --exclude 'cities/*'"],
  ])('accepts the exclusion in %s', (_name, command) => {
    expect(syncOf(command).every((one) => EXCLUDES_CITY_FILES.test(one))).toBe(true);
  });

  // INFRA-10, D-117
  it.each([
    ['no exclusion', 'aws s3 sync dist s3://b --delete'],
    ['another folder', 'aws s3 sync dist s3://b --delete --exclude "other/*"'],
    ['a longer folder name', 'aws s3 sync dist s3://b --delete --exclude "cities/*x"'],
  ])('refuses %s', (_name, command) => {
    expect(syncOf(command).every((one) => EXCLUDES_CITY_FILES.test(one))).toBe(false);
  });
});
