### Building so change stays cheap

Change will come, but a guess about which change is how over-engineering starts. So: structure that
makes any change local, and extension points only where the specs already say something will grow.
This does not override [simplicity-first.md](simplicity-first.md).

1. **Boundaries are checks, not advice.** A feature owns its screens, hooks and data access and is
   used only through its `index.ts`. `fallow` (already in `npm run verify`) has a `boundaries`
   setting with a `feature-sliced` preset: configure it in Phase 2, when `src/` first exists. A
   cross-feature import then fails the build. `src/shared/` is for code a second feature needs.
2. **What will grow is data, not code.** Languages (`src/constants/`), municipal sources
   (`pipelines/municipal/sources.json`), thresholds, limits, breakpoints, locale files. Adding a
   language or a city is an edit to data plus a test, not a new code path.
3. **A second use earns an abstraction.** The first use stays inline. No plugin systems, no
   interfaces with one implementation.
4. **Every convention gets a mechanical check.** `CLAUDE.md` is advisory and gets forgotten in a
   long session; a lint rule, test or hook does not. A new hard rule ships with its check (the
   RTL, inline-style and magic-number rules are lint rules, configured in `vite.config.ts`), and the
   error message names the fix.
5. **Plan before cross-cutting work.** A change touching more than one feature, or a table in
   [DATA.md](../../docs/DATA.md), starts with a plan the user can read. Small commits, small PRs, and
   [pre-pr-review.md](pre-pr-review.md) before opening one.
6. **No new third-party skills for now.** The built-in `simplify` and `code-review` and this repo's
   `ponytail-*` skills cover review. Revisit in Phase 2: a project skill that scaffolds a feature
   folder is worth writing once the first feature exists to copy from.
