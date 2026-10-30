### Working style
- **One phase at a time.** The build order is in PRODUCT.md.
- **Backend before screen.** Within a phase, build and test a screen's endpoints and tables before
  the screen itself.
- **Run `npm run verify` before saying anything is done.** Show the output. A Stop hook blocks the
  turn while it is red.
- **A rule is done when the server refuses to break it**, not when the button is disabled. Test it
  by calling the endpoint as a user who should be refused.
- **Tests start from the scenarios.** For a rule or route you touch, find its rows in
  `docs/TESTS-*.md` ([TESTING.md](../../docs/TESTING.md)) and cite the row id beside the `R-nn` in
  the test (`// LOG-07, R-10`). A case the catalogue lacks is added there first.
  The session that wrote the code does not write its tests: the `test-writer` agent does, from the
  docs only ([TESTING.md](../../docs/TESTING.md#agentic-workflow)).
- **When the spec and the code disagree, the spec wins.** Fix the code or raise it.
- **When the spec disagrees with itself, or a decision is missing, stop and ask.** Add it to
  DECISIONS.md with a recommendation.
- **Comment only when the code cannot say it.** Only a *why* that is not visible: a rule or decision
  it enforces (`R-nn`, `D-nn`), a workaround, a limit, a trap. One short line beats a block. Never
  restate the code or leave commented-out code. Applies to new and changed code; leave other
  comments alone unless asked. The `R-nn` citation in a test and the `ponytail:` marker stay.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Small commits, small
  PRs.
