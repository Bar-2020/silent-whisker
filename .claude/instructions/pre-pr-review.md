### Before opening a PR
Review the branch before opening a PR. Open it only after every finding is resolved.

1. Run `/ponytail-review` (over-engineering) and `/code-review` (correctness) on the branch diff.
2. Merge both outputs into one list. Their raw output is terse and full of tags (`yagni:`, `stdlib:`),
   so it is input, not the list you show. Rewrite every point as described in
   [How to write a finding](#how-to-write-a-finding). List every point, nits included, and merge
   duplicates. Number every finding `[R1]`, `[R2]`, ... (finding IDs, not the `R-nn` rules) so the
   reply can be "fix R1 and R3, skip R2".
3. Show the list and wait for the reply. If nobody is available to reply, say so and stop. Resolve
   each finding as the reply says (fix or skip), then run `npm run verify`.
4. Open the PR once no finding is left open. If the reviews find nothing, say so in one line and
   open it.

#### How to write a finding
The reader may not know the code, the rule numbers or AWS. Write so they can decide "fix or skip"
without opening anything. Short and plain beats complete.

Every finding has four parts:

- **Where:** the file and line.
- **What is wrong, in plain words.** One or two short sentences, everyday words. Start with what
  goes wrong for a person, the app or the bill, then say what in the code causes it. Give a small
  example when it makes it clearer ("two volunteers tap *fed* at the same moment and both get
  counted"). An unavoidable technical term gets a few words of explanation the first time it
  appears ("IAM, the AWS permission system").
- **Why it matters.** Name the rule or spec it breaks and say what that rule says (see below). Skip
  this part for a nit with no rule behind it.
- **Fix:** concrete enough to apply without guessing, and when there is a choice, say which one you
  would pick.

Add which review raised it (`/ponytail-review` or `/code-review`).

**Never mention a reference on its own.** Wherever a finding points at something else, say in a
few words what it is, in the same sentence. The reader should not need to open it. This covers:

- Rules and decisions: `R-10 (one counted feeding and one counted water log per spot per member per
  3 hours)`, never bare `R-10`. Same for `D-nn`.
- Files and sections: `surgical-changes.md (touch only what the request needs)`, `DATA.md (the
  tables and the queries they serve)`.
- Other findings: `same cause as [R2] (the missing cap check in the upload handler)`.
- Review tags: `yagni (built for a future that may never come)`, `stdlib (the language already
  ships this)`.

Read the rule's current text before summing it up: the `R-nn` rules are in
[RULES.md](../../docs/RULES.md) (the rules and where each is enforced), the `D-nn` decisions in
[DECISIONS.md](../../docs/DECISIONS.md) (accepted, proposed and open). Do not paraphrase from
memory, and if you cannot find it, say so instead of guessing.

Example (made up, for the shape only):

> **[R3]** `backend/log-feeding/handler.ts:42`
> **What is wrong:** The check "has this member already logged this spot?" runs before the save, as
> two separate steps. If a volunteer double-taps *fed*, both taps pass the check and the feeding is
> counted twice.
> **Why it matters:** R-10 (one counted feeding and one counted water log per spot per member per
> 3 hours) is only kept if the server refuses the second log, and here it does not.
> **Fix:** Make the check and the save one step, so the server refuses the second log and returns
> the "already logged" answer. Add a test that sends the request twice.
> **Raised by:** `/code-review`
