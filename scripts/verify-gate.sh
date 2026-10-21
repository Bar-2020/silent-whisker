#!/usr/bin/env bash
# Stop-hook gate: block a turn from ending while the working tree has changes
# that do not pass `npm run verify`.
#
# The guard matters as much as the check. A turn that only touches tool config
# or generated output has nothing `npm run verify` can fail on, and paying for a
# full typecheck + lint + test run on those is how a hook becomes something
# people switch off. So: exit 0 immediately unless something verifiable changed.
#
# Known gap: this reads the working tree, so a turn that commits everything it
# wrote leaves nothing for `git status` to report and the gate lets it end. CI
# is the backstop for that case.
set -uo pipefail

# Claude Code sets stop_hook_active when it is already continuing because this
# hook blocked. Without this, an unfixable failure loops forever.
if grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' <<<"$(cat)"; then
  exit 0
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 0

# Everything `npm run verify` reads: the code, the configs that drive the three
# checks, and the markdown the docs-link test walks. Documentation is in the
# list deliberately - that test is the only test the repo has today, so a
# docs-only turn is exactly the kind that can turn `npm test` red.
PATHS=(
  'src' 'infra' 'functions' '__tests__' 'scripts' '.github'
  'package.json' 'tsconfig.json' 'vite.config.ts' 'lint' '.fallowrc.json'
  'docs' '.claude/instructions' 'README.md' 'CLAUDE.md'
)

if [ -z "$(git status --porcelain -- "${PATHS[@]}" 2>/dev/null)" ]; then
  exit 0
fi

if ! OUTPUT=$(npm run --silent verify 2>&1); then
  echo "npm run verify failed - the turn cannot end until it passes." >&2
  echo "$OUTPUT" | tail -40 >&2
  exit 2
fi

exit 0
