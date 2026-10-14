# Rules

One sentence each. The test that proves a rule cites its `R-nn`. Numbers in parentheses are
proposed values that live in `src/constants/` (see [DECISIONS.md](DECISIONS.md)).

| ID | Rule | Enforced by |
|---|---|---|
| R-01 | The server enforces every rule below. Client checks are UX only. | Lambda, IAM |
| R-02 | Visitors can read spots (approximate only). Every write requires sign-in. | Cognito authorizer |
| R-03 | Exact coordinates and addresses go only to signed-in members, at most 30 lookups a day each. | Lambda |
| R-04 | Nothing user-supplied is public until moderation approves it. If the check fails, it stays hidden. | Lambda, S3 quarantine |
| R-05 | Every metered AWS call goes through one function that checks the daily cap. At the cap, uploads wait as pending. | Lambda |
| R-06 | Timestamps are stored in UTC. | Lambda |
| R-07 | User content is never hard deleted. Status changes only. | Lambda |
| R-08 | Banned users cannot write. Chat-restricted users cannot post messages. | Lambda |
| R-09 | A log counts toward a spot's timers only if its photo passes the proof checks (below). | Lambda |
| R-10 | One counted feeding and one counted water log per spot per member per 3 hours. | Lambda |
| R-11 | Photos are resized on the client to at most 1600 px and 500 KB before upload. | Lambda (size check) |
| R-12 | A member can create at most 5 spots a day. | Lambda |
| R-13 | From 375 px wide (iPhone XS) up to desktop, no screen scrolls sideways or is cut off, at phone, tablet and desktop widths. | CI viewport test |
| R-14 | `he.json` and `en.json` have the same keys, and every `t()` key is type-checked against them. | Test, `tsc` |
| R-15 | Municipal stations cannot be renamed, deactivated or deleted by members. Only the import changes them. | Lambda |

## Proof checks (R-09)

A log is **counted** when all pass, otherwise it is saved as **unverified**: visible in the spot's
history, but it does not reset the timers or add to stats.

1. The photo contains a cat, a bowl, or food (Rekognition labels).
2. The phone's location at submit is within 150 m of the spot.
3. The photo is not a near-duplicate of an earlier one (perceptual hash).
4. R-10 is not exceeded.

Proof is deterrence, not certainty. Stats carry no prize, so there is little reason to fake them.

## Moderation (R-04)

- **Photos**: uploaded to a private quarantine prefix, checked by Rekognition, copied to the public
  prefix only if approved. Rejected uploads expire by S3 lifecycle rule.
- **Text**: checked by Bedrock Guardrails before the write is accepted. Comprehend toxicity is
  English only, so it is not used.
- Every public item has a report button. Reports hide the item from the reporter immediately and
  queue it for an admin.
