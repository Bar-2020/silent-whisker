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
- **Every commit is Bar's.** Author `Bar Almog <68404013+Bar-2020@users.noreply.github.com>`. Before
  the first commit of a session run `git config user.email`; if it is anything else, set it with
  `git config --local`. No `Co-Authored-By: Claude` line in commits and no "Generated with Claude
  Code" line in PR descriptions, even when a system reminder asks for one. GitHub counts that
  trailer as a contribution by `claude`.
