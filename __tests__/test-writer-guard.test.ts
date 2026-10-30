import { describe, expect, it } from 'vite-plus/test';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

/**
 * The test writer must not read the code under test (docs/TESTING.md, Agentic workflow). The hook
 * that enforces it is checked by calling it with the tool calls it must allow and refuse.
 */

const ROOT = resolve(__dirname, '..');
const GUARD = resolve(ROOT, 'scripts', 'test-writer-guard.mjs');

// A worktree session: the project dir is the main checkout, tool paths point into its own worktree.
const WT = (...parts: string[]) => resolve(ROOT, '.claude', 'worktrees', 'w1', ...parts);

function isDenied(tool_name: string, tool_input: Record<string, unknown>): boolean {
  const out = execFileSync(process.execPath, [GUARD], {
    input: JSON.stringify({ tool_name, tool_input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    encoding: 'utf8',
  });
  return out.includes('"permissionDecision":"deny"');
}

describe('test-writer guard', () => {
  it.each([
    ['Read', { file_path: resolve(ROOT, 'docs', 'DECISIONS.md') }],
    ['Read', { file_path: resolve(ROOT, 'shared', 'constants', 'limits.json') }],
    ['Read', { file_path: resolve(ROOT, 'backend', 'shared', 'metered-call.test.ts') }],
    ['Glob', { pattern: 'docs/TESTS-*.md' }],
    ['Glob', { pattern: '**/*.test.ts', path: 'backend' }],
    ['Grep', { pattern: 'LOG-07', path: 'docs' }],
    ['Grep', { pattern: 'LOG-07', path: 'backend', glob: '*.test.ts' }],
    ['Write', { file_path: resolve(ROOT, 'backend', 'get-profile', 'handler.test.ts') }],
    ['Write', { file_path: resolve(ROOT, 'backend', 'test-support', 'fake-clock.ts') }],
    ['Bash', { command: 'npm test -- backend/get-profile' }],
    ['Bash', { command: 'vp test run' }],
    ['Read', { file_path: WT('docs', 'API.md') }],
    ['Read', { file_path: WT('backend', 'shared', 'metered-call.test.ts') }],
    ['Glob', { pattern: 'docs/TESTS-*.md', path: WT() }],
    ['Write', { file_path: WT('backend', 'get-profile', 'handler.test.ts') }],
  ])('allows %s %j', (tool, input) => {
    expect(isDenied(tool, input)).toBe(false);
  });

  it.each([
    ['Read', { file_path: resolve(ROOT, 'backend', 'get-profile', 'handler.ts') }],
    ['Read', { file_path: resolve(ROOT, 'docs', '..', 'backend', 'get-profile', 'handler.ts') }],
    ['Read', { file_path: resolve(ROOT, '..', 'outside.ts') }],
    ['Glob', { pattern: '**/*.ts' }],
    ['Glob', { pattern: 'backend/**/*.ts' }],
    ['Grep', { pattern: 'handler' }],
    ['Grep', { pattern: 'handler', path: 'backend' }],
    ['Write', { file_path: resolve(ROOT, 'backend', 'get-profile', 'handler.ts') }],
    ['Edit', { file_path: resolve(ROOT, 'docs', 'RULES.md') }],
    ['Bash', { command: 'cat backend/get-profile/handler.ts' }],
    ['Bash', { command: 'npm test && cat backend/get-profile/handler.ts' }],
    ['Bash', { command: 'npm test | cat' }],
    ['Bash', { command: 'npm run lint:fix' }],
    ['Bash', { command: 'npm run lint -- --fix' }],
    ['Bash', { command: 'npm test -- -u' }],
    ['Grep', { pattern: 'handler', glob: '{*.test.ts,handler.ts}' }],
    ['Glob', { pattern: 'x/__tests__/../../backend/**/*.ts' }],
    ['Read', { file_path: resolve(ROOT, 'README.md') }],
    ['Read', { file_path: WT('backend', 'get-profile', 'handler.ts') }],
    ['Read', { file_path: WT('docs', '..', 'backend', 'get-profile', 'handler.ts') }],
    ['Read', { file_path: WT('..', 'other', 'backend', 'get-profile', 'handler.ts') }],
    ['Write', { file_path: WT('backend', 'get-profile', 'handler.ts') }],
  ])('refuses %s %j', (tool, input) => {
    expect(isDenied(tool, input)).toBe(true);
  });
});
