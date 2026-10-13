### Before opening a PR
Review the branch before opening a PR. Open it only after every finding is resolved.

1. Run `/ponytail-review` (over-engineering) and `/code-review` (correctness) on the branch diff.
2. Merge both outputs into one list. Number every finding `[R1]`, `[R2]`, ... (finding IDs, not the
   `R-nn` rules) so the reply can be "fix R1 and R3, skip R2". List every point, nits included. For
   each one give the file and line, what is wrong, a concrete fix, and which review raised it.
3. Show the list and wait for the reply. If nobody is available to reply, say so and stop. Resolve
   each finding as the reply says (fix or skip), then run `npm run verify`.
4. Open the PR once no finding is left open. If the reviews find nothing, say so in one line and
   open it.
