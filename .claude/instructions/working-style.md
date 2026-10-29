### Working style
- **One phase at a time.** The build order is in PRODUCT.md.
- **Run `npm run verify` before saying anything is done.** Show the output. A Stop hook blocks the
  turn while it is red.
- **A rule is done when the server refuses to break it**, not when the button is disabled. Test it
  by calling the endpoint as a user who should be refused.
- **When the spec and the code disagree, the spec wins.** Fix the code or raise it.
- **When the spec disagrees with itself, or a decision is missing, stop and ask.** Add it to
  DECISIONS.md with a recommendation.
- **Comment only when the code cannot say it.** Good names and small functions come first. Write a
  comment for a *why* that is not visible: a rule or decision it enforces (`R-nn`, `D-nn`), a
  workaround, a limit, a trap. Never restate what the next line does, never narrate, never leave
  commented-out code. One short line beats a block; no comment on a self-explanatory function. The
  `R-nn` citation in a test and the `ponytail:` marker stay.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Small commits, small
  PRs.
