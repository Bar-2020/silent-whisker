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
| R-09 | A log counts toward a spot's timers only if it passes the proof checks (below). | Lambda |
| R-10 | One counted feeding and one counted water log per spot per member per 3 hours. | Lambda |
| R-11 | Photos are resized on the client to at most 1600 px and 500 KB before upload. | Lambda (size check) |
| R-12 | A member can create at most 5 spots a day. | Lambda |
| R-13 | A member has at most 30 counted feeding and water logs in any rolling 24 hours. | Lambda |
| R-16 | A "this spot was empty" report needs the reporter within the proof radius of the spot, never disputes the reporter's own log, and is allowed once per spot per type (food or water) per member per 3 hours. | Lambda |
| R-17 | A member can make at most 60 log or empty-report attempts a day, counted or not, and a refused attempt gets one identical answer whatever check failed. | Lambda |

## Proof checks (R-09)

A log is **counted** when all pass, otherwise it is saved as **unverified**: visible in the spot's
history, but it does not reset the timers or add to stats. No photo is needed (D-18).

1. The phone's location, read at the moment of submit, is within the proof radius (50 m) of the
   spot and reports an accuracy of 50 m or better (D-25).
2. R-10 is not exceeded.
3. R-13 is not exceeded.

The answer to the member says only counted or unverified, never the distance. Every attempt counts
toward R-17. The phone's own coordinates are not stored.

Proof is deterrence, not certainty: a browser cannot prove a location is real. The "this spot was
empty" report (R-16, D-19) corrects a wrong log. Stats carry no prize, so there is little reason to
fake them.

## Moderation (R-04)

- **Photos**: uploaded to a private quarantine prefix, checked by Rekognition, copied to the public
  prefix only if approved. Rejected uploads expire by S3 lifecycle rule.
- **Profile pictures**: not uploaded in v1. The member's own Google account photo is shown as
  Google supplies it, only if the member chose to (D-21, D-27).
- **Text**: checked by Bedrock Guardrails before the write is accepted. Comprehend toxicity is
  English only, so it is not used. Standard tier may process the text in another EU Region (D-13).
- Every public item has a report button. Reports hide the item from the reporter immediately and
  queue it for an admin.
