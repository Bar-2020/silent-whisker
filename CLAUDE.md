# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.


---

## Design docs

**`docs/` is the source of truth.** Five short files, each capped at 150 lines (a test enforces it):

| File | What it holds |
|---|---|
| [PRODUCT.md](docs/PRODUCT.md) | What the app is, v1 scope, non-goals, money |
| [RULES.md](docs/RULES.md) | The `R-nn` rules and where each is enforced |
| [DATA.md](docs/DATA.md) | Tables and the queries they serve |
| [API.md](docs/API.md) | Endpoint table |
| [DECISIONS.md](docs/DECISIONS.md) | The `D-nn` log: accepted, proposed, open |

Read PRODUCT and RULES first, then only the file your task touches. If you edit a spec, keep it
short: cut before you add.

## Project: Silent Whisker

A free, open-source (MIT) web app where volunteers map stray-cat feeding spots, log feedings and
water with photo proof, flag cats in danger, and chat. Hebrew first, English second. Israel first.
Runs on AWS inside the free tier where possible. Ads and donation links cover the rest.

### Hard rules, no exceptions
- **Server enforces every rule.** Auth, privacy, moderation, caps, bans: all in Lambda or IAM.
  Client checks are UX, never enforcement. A rule that only exists in the client is not implemented.
- **Every user-facing string goes through `t('key')`.** No hardcoded strings, not even placeholders.
- **RTL-safe styles.** CSS logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`), never `left`/`right`. Hebrew is the primary language.
- **All timestamps stored in UTC.** Convert at display time only.
- **No hard deletes of user content.** Status changes only. Exceptions: account deletion, and
  quarantined uploads that moderation rejected (an S3 lifecycle rule expires them).
- **TypeScript strict.** No `any`, no `@ts-ignore` to get past a real type error.
- **Constants live in `src/constants/`** (limits, thresholds, caps). Never inline the numbers.
- **Nothing user-supplied is public until moderation approves it.** Photos and text. If the
  moderation call fails, the content stays hidden.
- **Exact coordinates and addresses never leave the server** except to a signed-in member, within
  the daily lookup limit (R-03).
- **Every metered AWS call goes through one function that checks the daily cap** (R-05).

### Naming
`R-nn` rules, `D-nn` decisions, `snake_case` for stored fields. Never renumber, never reuse. Cite
the `R-nn` in the test that proves it.

### Folder structure
Feature-based. `src/features/<feature>/` owns its screens, components, hooks and data access.
`src/shared/` only when a second feature needs it. **Features never import from each other.**
`infra/` is the AWS CDK app, `functions/` the Lambda handlers.

### Working style
- **One phase at a time.** The build order is in PRODUCT.md.
- **Run `npm run verify` before saying anything is done.** Show the output. A Stop hook blocks the
  turn while it is red.
- **A rule is done when the server refuses to break it**, not when the button is disabled. Test it
  by calling the endpoint as a user who should be refused.
- **When the spec and the code disagree, the spec wins.** Fix the code or raise it.
- **When the spec disagrees with itself, or a decision is missing, stop and ask.** Add it to
  DECISIONS.md with a recommendation.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Small commits, small
  PRs.

### Current state
Phase 0: the verification harness only. No app code yet.
