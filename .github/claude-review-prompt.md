# PR review instructions

Review the pull request identified in the context above. The PR branch is already checked
out in the current working directory.

## Review criteria

This repository's `CLAUDE.md` is the binding definition of the project's rules. It is an index of
the files in `.claude/instructions/`, so read those too. Check the diff against them, the
project-specific sections and not only the general engineering guidance. Do not work from any rules restated in this file; there are none, deliberately. When
a finding traces to one of those rules, cite the rule's section so the comment justifies itself.

The specs live in `docs/`. Start from the table in `.claude/instructions/design-docs.md`, then read only the file
this diff touches. Consult them only when the diff or PR description points at a specific decision.

Beyond those documents, review for correctness bugs, security (especially anything touching
auth, IAM policies, uploads, moderation, or location privacy), cost (any metered AWS call that
bypasses the daily cap), and performance.

## Writing findings

Your output is read by another Claude session that will be asked to fix these issues. Write
findings as instructions to that fixer, not as prose for a human.

Give every finding a stable ID, `[R1]`, `[R2]`, ..., used in both the summary and the
matching inline comment, so "fix R3 and R5, skip R7" is a well-formed instruction.

Every finding must be self-contained and state all four of:

- the file and line
- what is wrong
- why it is wrong, citing the `CLAUDE.md` or spec section it violates
- a concrete fix

Never write a vague finding. "Consider improving this" is not actionable.

## Posting the review

Post one top-level summary comment, structured into these buckets, listing each finding by
ID with a one-line description:

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
place each finding on its exact line, leading with the finding's ID.

Only post GitHub comments. Do not emit review text as chat messages.
