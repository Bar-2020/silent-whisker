# CLAUDE.md

Each section lives in its own file in `.claude/instructions/`. Only this index is always loaded:
open a file when its note applies, before you start the work it covers.

| File | What it holds, and when to read it |
|---|---|
| [behavioral-guidelines.md](.claude/instructions/behavioral-guidelines.md) | Preamble to the four guidelines below: caution over speed, judgment on trivial tasks |
| [think-before-coding.md](.claude/instructions/think-before-coding.md) | State assumptions, surface tradeoffs, ask when unclear. Before any non-trivial task |
| [simplicity-first.md](.claude/instructions/simplicity-first.md) | Minimum code, nothing speculative. Before writing code |
| [surgical-changes.md](.claude/instructions/surgical-changes.md) | Touch only what the request needs, clean up only your own orphans. Before editing existing code |
| [goal-driven-execution.md](.claude/instructions/goal-driven-execution.md) | Turn the task into verifiable goals and loop until verified. Before multi-step work |
| [design-docs.md](.claude/instructions/design-docs.md) | The five specs in `docs/` and which to read first. Before a task that touches behavior or specs |
| [project.md](.claude/instructions/project.md) | What Silent Whisker is: audience, languages, hosting, funding. When you need product context |
| [hard-rules.md](.claude/instructions/hard-rules.md) | Ten non-negotiables: server enforcement, `t('key')`, RTL, UTC, privacy, moderation, AWS cap. Before writing or reviewing any code |
| [naming.md](.claude/instructions/naming.md) | `R-nn`, `D-nn`, `snake_case`, never renumber. Before adding rules, decisions, stored fields or tests |
| [folder-structure.md](.claude/instructions/folder-structure.md) | Feature-based layout, features never import each other. Before creating or moving files |
| [working-style.md](.claude/instructions/working-style.md) | One phase at a time, `npm run verify`, the spec wins, Conventional Commits. Before you start and before you say done |
| [pre-pr-review.md](.claude/instructions/pre-pr-review.md) | Numbered `[R1]...` review with `/ponytail-review` and `/code-review`. Before opening a PR |
| [current-state.md](.claude/instructions/current-state.md) | Which build phase the repo is in. Before planning |
