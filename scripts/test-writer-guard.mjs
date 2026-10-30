import { readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// PreToolUse hook of the test-writer agent: it reads the docs, never the code under test
// (docs/TESTING.md, Agentic workflow).
const READABLE_DIRS = ['docs/', 'shared/constants/', 'shared/schemas/', 'backend/shared/schemas/'];
const TEST_SUFFIX = /\.test\.[cm]?[jt]sx?$/;
const TEST_DIR = /(^|\/)(__tests__|test-support)\//;
const RUN_COMMAND =
  /^(npm (test|run (test|verify|lint|typecheck|fallow))|vp test run)( [^;&|`$<>\n]*)?$/;
// Flags that make a run write files.
const WRITING_FLAG = /--fix|--update|\s-u\b/;
const GLOB_CHARS = /[*?[{]/;

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const text = (value) => String(value ?? '');
const rel = (path) =>
  relative(root, resolve(root, text(path)))
    .split(sep)
    .join('/');
const isTest = (path) => TEST_SUFFIX.test(path) || TEST_DIR.test(`${path}/`);
const readable = (path) => READABLE_DIRS.some((dir) => `${path}/`.startsWith(dir)) || isTest(path);
const globPrefix = (pattern) => pattern.split(GLOB_CHARS)[0];
const runnable = (command) => RUN_COMMAND.test(command.trim()) && !WRITING_FLAG.test(command);

const allowed = {
  Read: (input) => readable(rel(input.file_path)),
  Glob: (input) =>
    TEST_SUFFIX.test(text(input.pattern)) ||
    readable(rel(join(text(input.path), globPrefix(text(input.pattern))))),
  Grep: (input) => readable(rel(input.path)) || TEST_SUFFIX.test(text(input.glob)),
  Write: (input) => isTest(rel(input.file_path)),
  Edit: (input) => allowed.Write(input),
  Bash: (input) => runnable(text(input.command)),
};

const deny = (reason) => {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
};

try {
  const { tool_name: tool, tool_input: input } = JSON.parse(readFileSync(0, 'utf8'));
  if (!(allowed[tool]?.(input ?? {}) ?? true)) {
    deny(
      'The test writer reads docs/, shared/constants/, the schema folders and test files, and writes only test files. ' +
        'Something missing from the docs is a doc gap: report it (docs/TESTING.md, Agentic workflow).'
    );
  }
} catch {
  deny('The test-writer guard could not read this tool call.');
}
