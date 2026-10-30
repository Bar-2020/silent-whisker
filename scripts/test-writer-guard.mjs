import { readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// PreToolUse hook of the test-writer agent: it reads the docs, never the code under test
// (docs/TESTING.md, Agentic workflow).
const READABLE_DIRS = ['docs/', '.claude/instructions/', 'shared/constants/'];
const READABLE_FILES = ['CLAUDE.md', 'README.md'];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$|(^|\/)(__tests__|test-support)\//;
const TEST_GLOB = /\.test\.|(__tests__|test-support)\//;
const RUN_COMMAND = /^(npm (test|run [\w:-]+)|vp test run)\b[^;&|`$<>\n]*$/;
const GLOB_CHARS = /[*?[{]/;

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const text = (value) => String(value ?? '');
const rel = (path) =>
  relative(root, resolve(root, text(path)))
    .split(sep)
    .join('/');
const readable = (path) =>
  READABLE_DIRS.some((dir) => `${path}/`.startsWith(dir)) ||
  READABLE_FILES.includes(path) ||
  TEST_FILE.test(path);
const globPrefix = (pattern) => pattern.split(GLOB_CHARS)[0];

const allowed = {
  Read: (input) => readable(rel(input.file_path)),
  Glob: (input) =>
    TEST_GLOB.test(text(input.pattern)) ||
    readable(rel(join(text(input.path), globPrefix(text(input.pattern))))),
  Grep: (input) => readable(rel(input.path)) || TEST_GLOB.test(text(input.glob)),
  Write: (input) => TEST_FILE.test(rel(input.file_path)),
  Edit: (input) => TEST_FILE.test(rel(input.file_path)),
  Bash: (input) => RUN_COMMAND.test(text(input.command).trim()),
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
      'The test writer reads docs/, shared/constants/ and test files, and writes only test files. ' +
        'Something missing from the docs is a doc gap: report it (docs/TESTING.md, Agentic workflow).'
    );
  }
} catch {
  deny('The test-writer guard could not read this tool call.');
}
