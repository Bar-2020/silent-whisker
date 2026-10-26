# PR review instructions

Review the pull request identified in the context above. The PR branch is already checked
out in the current working directory.

## Review criteria

This repository's `CLAUDE.md` is the binding definition of the project's rules. It is an index of
the files in `.claude/instructions/`, so read those too. Check the diff against them, the
project-specific sections and not only the general engineering guidance. Do not work from any
rules restated in this file; there are none, deliberately. When a finding traces to one of those
rules, cite the rule's section and say in a few words what it says, so the comment justifies itself.

The specs live in `docs/`. Start from the table in `.claude/instructions/design-docs.md`, then
read only the file this diff touches. Consult them only when the diff or PR description points at
a specific decision.

Beyond those documents, review for correctness bugs, security (especially anything touching
auth, IAM policies, uploads, moderation, or location privacy), cost (any metered AWS call that
bypasses the daily cap), and performance.

## Writing findings

Two readers use your output: the project owner, who decides which findings to fix and may not
know the code, the rule numbers or AWS, and then another Claude session that applies the fixes.
Write for both: plain words first, then an exact fix.

Write every finding as `.claude/instructions/pre-pr-review.md` describes under "How to write a
finding" (plain words, every reference explained). Read that section before you start. A Blocking
or Should-fix finding must always say which rule or spec section it breaks; only a nit may leave
that out.

Give every finding a stable ID, `[R1]`, `[R2]`, ..., used in both the summary and the
matching inline comment, so "fix R3 and R5, skip R7" is a well-formed instruction.

Never write a vague finding. "Consider improving this" is not actionable, and neither is a finding
that only makes sense to someone who already knows the code.

## Posting the review

Post one top-level summary comment, structured into these buckets, listing each finding by
ID with a one-line description in plain words (no bare rule numbers):

- 🔴 **Blocking**: must fix before merge
- 🟡 **Should fix**: real problems, non-blocking
- 🔵 **Nits**: optional

Begin the summary with the reviewed commit: `Reviewed <HEAD SHA>`, using the SHA given in
the context above. Omit any bucket that is empty. If the PR is clean, say so in one line;
do not invent findings to fill buckets.

Post the summary with:

```
gh pr comment <PR NUMBER> --edit-last --create-if-none --body "..."
```

This replaces the previous review, so exactly one summary comment exists and it always
describes the current commit.

Then use `mcp__github_inline_comment__create_inline_comment` (with `confirmed: true`) to
place each finding on its exact line, leading with the finding's ID. The inline comment holds the
full finding (what is wrong, why it matters, fix), not just the one-line summary.

Only post GitHub comments. Do not emit review text as chat messages.
