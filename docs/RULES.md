# Rules

One sentence each. The test that proves a rule cites its `R-nn`. Numbers in parentheses are
proposed values that live in `shared/constants/` (see [DECISIONS.md](DECISIONS.md)).

| ID | Rule | Enforced by |
|---|---|---|
| R-01 | The server enforces every rule below. Client checks are UX only. | Lambda, IAM |
| R-02 | Replaced by R-22 (it let visitors read spots, approximate only). | |
| R-03 | Every position is exact. City stations and cat alerts go to every signed-in member. A custom spot goes to a member in any one of three cases: the member's phone is within 150 m of it with an accuracy of 50 m or better; the spot is active and its food or water is not green; or the member is its creator or an admin (D-47). | Lambda |
| R-04 | Nothing user-supplied is public until moderation approves it. If the check fails, it stays hidden. | Lambda, S3 quarantine |
| R-05 | Every metered AWS call goes through one function, `meteredCall` in `backend/shared/metered-call.ts`, that checks the global circuit breaker (a lint rule fails a file that imports a paid AWS client without it), and every paid action is also under a per-member daily limit, counted when the action starts (D-52). Once the breaker has tripped, new content is saved pending and checked after the UTC day resets (D-53); nothing is refused for it and nothing is shown before it passes. | Lambda |
| R-06 | Timestamps are stored in UTC. | Lambda |
| R-07 | User content is never hard deleted. Status changes only. | Lambda |
| R-08 | Banned users cannot write. Chat-restricted users cannot post chat messages or comments. | Lambda |
| R-09 | A log counts toward a spot's timers only if it passes the proof checks (below). | Lambda |
| R-10 | One counted feeding and one counted water log per spot per member per 3 hours. | Lambda |
| R-11 | Photos are resized on the client to at most 1600 px and 500 KB before upload. | Lambda (size check) |
| R-12 | A member can create at most 5 spots a day. | Lambda |
| R-13 | A member has at most 30 counted feeding and water logs in any rolling 24 hours. | Lambda |
| R-16 | A "this spot was empty" report needs the reporter within the proof radius of the spot, never disputes the reporter's own log, and is allowed once per spot per type (food or water) per member per 3 hours. | Lambda |
| R-17 | A member can make at most 60 log or empty-report attempts a day, counted or not, and a refused empty report gets one identical answer whatever check failed. | Lambda |
| R-18 | From 360 px wide up to desktop, no screen scrolls sideways or is cut off, at phone, tablet and desktop widths. The iPhone XS (375 x 812 px) is the smallest iPhone tested. | CI viewport test |
| R-19 | `he.json` and `en.json` have the same keys, and every `t()` key is type-checked against them. | Test, `tsc` |
| R-20 | Municipal stations cannot be renamed, deactivated or deleted by members. Only the import changes them. | Lambda |
| R-21 | Every endpoint is rate limited: per route at the API front door, and per member for writes. Over the limit the request is refused and nothing is saved (429). The per-member limit, counted in Lambda, answers `RATE_LIMITED` with `Retry-After`; the front door's own 429 is bare, so the app treats every 429 alike and waits a default time (D-57). The app files and `/locales/` have no per-IP limit, because there is no WAF for now; CloudFront's free allowance and the spend limit bound them (D-38, D-49). Every limit is a constant. | API Gateway, Lambda |
| R-22 | Every API route requires a valid sign-in. The only things served without one are the landing page, the privacy policy, the terms and the translation files. | Cognito authorizer |
| R-23 | A cat alert needs a photo, a note and the phone's location, read at submit, with an accuracy of 50 m or better (D-25), or nothing is saved. A member can raise at most 5 cat alerts a day. | Lambda |
| R-24 | Members see a cat alert only while it is approved, not resolved and not expired: it expires 6 hours after it is raised, plus 12 hours for each extension, counted from the old expiry or from now, whichever is later, with no limit on extensions. Only an admin can resolve or extend one, and can still see and extend one for 24 hours after it expired, but not a resolved one. | Lambda |
| R-25 | A cat photo, and the photo of a cat alert, must contain a cat (checked by the photo check, D-09), or it is rejected and never shown. A member can post at most 10 cat photos and write at most 60 comments a day. | Lambda |
| R-26 | A member's like on a cat counts once; liking again takes it back. | Lambda |
| R-27 | A custom spot stays hidden from other members, and takes no logs or empty reports, until an admin approves it. Only an admin can approve or reject one. | Lambda |
| R-28 | A cat photo keeps no exact position, only its neighbourhood cell and a place tag, and the feed rounds the member's own position to a cell too, so nothing filters on a precise point. Cat photos are never returned by the map routes. | Lambda |
| R-29 | The feed returns the cat photos that are not on the seen list the app sends before any that are. The list is kept on the member's phone, not on the server. | Lambda |
| R-30 | A member can upload at most 20 photos a day, counted when the upload starts, whether or not the photo is approved later. | Lambda |
| R-31 | A member can post at most 100 chat messages a day (D-52). | Lambda |

## Proof checks (R-09)

A log is **counted** when the location check passes, otherwise it is saved as **unverified**:
visible in the spot's history, but it does not reset the timers or add to stats. No photo is needed
(D-18).

- The phone's location, read at the moment of submit, is within the proof radius (50 m) of the
  spot and reports an accuracy of 50 m or better (D-25).

A log over R-10 or R-13 is refused and not saved (D-23).

The answer to the member says only counted or unverified, never the distance. Every attempt counts
toward R-17. The phone's own coordinates are not stored.

Proof is deterrence, not certainty: a browser cannot prove a location is real. The "this spot was
empty" report (R-16, D-19) corrects a wrong log. Stats carry no prize, so there is little reason to
fake them.

## Moderation (R-04)

- **Photos**: uploaded to a private quarantine prefix, checked by the photo check (D-09), copied to the public
  prefix only if approved. Members see approved photos through short-lived signed URLs, never an
  open address (D-39). Rejected uploads expire by S3 lifecycle rule.
- **Profile pictures**: not uploaded in v1. The member's own Google account photo is shown as
  Google supplies it, only if the member chose to (D-21, D-27).
- **Text**: checked by Bedrock Guardrails before the write is accepted. Standard tier may
  process the text in another EU Region (D-49).
- Every public item has a report button. Reports hide the item from the reporter immediately and
  queue it for an admin.
