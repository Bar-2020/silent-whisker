import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vite-plus/test';

const BACKEND = resolve(__dirname, '../backend');

/** Scheduled jobs: no member calls them (a schedule does, INFRA-11, INFRA-12), so they have no member to check. */
const SCHEDULED_JOBS = ['update-cities'];

/** Reads every handler as text, so a route added later is checked too (a handler test sees only today's). */
describe('Handlers get their member through requireLiveMember (PROF-30, D-109, R-22)', () => {
  const handlers = readdirSync(BACKEND, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SCHEDULED_JOBS.includes(entry.name))
    .filter((entry) => existsSync(join(BACKEND, entry.name, 'handler.ts')))
    .map((entry) => ({
      name: entry.name,
      text: readFileSync(join(BACKEND, entry.name, 'handler.ts'), 'utf8'),
    }));

  it('finds the handlers it is supposed to check', () => {
    expect(handlers.map((handler) => handler.name)).toEqual(
      expect.arrayContaining(['get-profile', 'update-profile', 'delete-profile'])
    );
  });

  it.each(handlers)('$name calls requireLiveMember', ({ text }) => {
    expect(text).toContain('requireLiveMember(');
  });

  it.each(handlers)('$name never calls verifiedClaims itself', ({ text }) => {
    expect(text).not.toContain('verifiedClaims');
  });
});
