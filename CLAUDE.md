# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

Longer guidelines live in `.claude/instructions/`. Open a file when its note applies, before you
start the work it covers. The hard rules and working style are imported below, so they always load.

| File | What it holds, and when to read it |
|---|---|
| [think-before-coding.md](.claude/instructions/think-before-coding.md) | State assumptions, ask when unclear. Before any non-trivial task |
| [simplicity-first.md](.claude/instructions/simplicity-first.md) | Minimum code, nothing speculative. Before writing code |
| [surgical-changes.md](.claude/instructions/surgical-changes.md) | Touch only what the request needs. Before editing existing code |
| [goal-driven-execution.md](.claude/instructions/goal-driven-execution.md) | Verifiable goals, loop until verified. Before multi-step work |
| [design-docs.md](.claude/instructions/design-docs.md) | The specs in `docs/` and which to read first. Before a task that touches behavior or specs |
| [extensibility.md](.claude/instructions/extensibility.md) | How to build so future change stays cheap. Before adding a feature, folder or shared module |
| [pre-pr-review.md](.claude/instructions/pre-pr-review.md) | Numbered `[R1]...` review with `/ponytail-review` and `/code-review`. Before opening a PR |

## Project: Silent Whisker

A free, open-source (MIT) web app where volunteers map stray-cat feeding spots, log feedings and
water, flag cats in danger, and chat. Hebrew first, English second. Israel first.
Runs on AWS inside the free tier where possible. Ads and donation links cover the rest.

@.claude/instructions/hard-rules.md

### Naming
`R-nn` rules, `D-nn` decisions, `snake_case` for stored fields. Never renumber, never reuse. Cite
the `R-nn` in the test that proves it. When talking to the user, never write a rule or decision
number on its own (`R-10`, `D-17`): always say what it is, for example "R-10 (one counted feeding
and one counted water log per spot per member per 3 hours)". A human does not remember the numbers.

### Folder structure
Feature-based. `src/features/<feature>/` owns its screens, components, hooks and data access.
`src/shared/` only when a second feature needs it. **Features never import from each other.**
`infra/` is the AWS CDK app, `functions/` the Lambda handlers.

@.claude/instructions/working-style.md

### Current state
Phase 1: AWS infra and deploy pipeline (CDK in `infra/`, one-time setup in
[infra/README.md](infra/README.md)). No app screens yet.
