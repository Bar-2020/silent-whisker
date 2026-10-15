# API

Draft. Lambda behind CloudFront. JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status. Every route can also answer
`RATE_LIMITED` (429, with `Retry-After`, R-21).
"Member" means a valid Google sign-in through Cognito. Every route needs one (R-22).

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | member | Approved spots in the viewport at their exact point: every city station, and the custom spots R-03 allows, using the optional `lat`, `lng`, `accuracy_m` (not stored); plus the caller's own pending ones (R-27) | |
| `POST /spots` | member | Create a custom spot, saved as `pending` (R-27), from either `address` (looked up) or `lat`, `lng`, `accuracy_m` ("my location"), plus optional `name` and `photo_key` (D-43) | `DAILY_LIMIT` (R-12), `ADDRESS_NOT_FOUND` (D-43), `LOCATION_REQUIRED` (D-43), `BANNED`, `MODERATION_REJECTED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `UPLOAD_LIMIT` (R-30), `CAP_REACHED` (R-05) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log from `kind`, `amount`, `lat`, `lng`, `accuracy_m`. The answer is only counted or unverified, never the distance | `BANNED`, `ATTEMPT_LIMIT` (R-17), `TOO_SOON` (R-10), `LOG_LIMIT` (R-13) |
| `POST /spots/{id}/empty` | member | Report the food or the water as empty (D-19) | `BANNED`, `ATTEMPT_LIMIT` (R-17), `REFUSED` (R-16, one answer for every failed check) |
| `GET /spots/{id}` | member | Spot detail with the exact address, approved logs, approved cats with their like counts; a custom spot only as R-03 allows, from the same optional `lat`, `lng`, `accuracy_m` | `NOT_FOUND` (also when R-03 hides it, so a hidden spot looks like a missing one) |
| `POST /cats` | member | Post a cat photo from `photo_key`, optional `name`, and either `spot_id` (a cat at a spot) or `lat`, `lng` (a random cat; rounded to a neighbourhood cell and not stored; with neither, the profile city is used) (D-44) | `BANNED`, `DAILY_LIMIT` (R-25), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cats/feed` | member | The next 20 photos of the feed: recent approved cat photos close by that the member has not seen, most liked first, skipping the ids in `seen` (the photos the app has shown, the last few hundred), then the seen ones again when none are left; each with a place tag and no coordinates (R-28, R-29, D-45). Optional `lat`, `lng`, rounded to a neighbourhood cell (else the profile city); they are not stored. It is a POST only because the `seen` list is too long for a URL; it writes nothing | |
| `POST /cats/{id}/like` | member | Like, or take the like back (R-26) | `BANNED` |
| `GET /cats/{id}/comments`, `POST /cats/{id}/comments` | member | Read or write comments | `BANNED`, `DAILY_LIMIT` (R-25), `MODERATION_REJECTED` |
| `GET /cat-alerts?bbox=` | member | Cat alerts shown under R-24, with their exact point (D-47); the map and the list use the same answer. Admins also get ones that expired in the last 24 hours | |
| `POST /cat-alerts` | member | Raise a cat alert from `kind`, `lat`, `lng`, `accuracy_m`, `note`, `photo_key` (D-41) | `BANNED`, `DAILY_LIMIT` (R-23), `LOCATION_REQUIRED` (R-23, missing or too vague), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cat-alerts/{id}/resolve`, `POST /cat-alerts/{id}/extend` | admin | Hide a cat alert now, or add 12 hours (any number of times) | `FORBIDDEN`, `ALREADY_RESOLVED` (R-24) |
| `GET /messages?scope=&id=`, `POST /messages` | member | Chat | `CHAT_RESTRICTED` (R-08) |
| `POST /reports` | member | Report content | |
| `PATCH /me` | member | Update profile: full name, city, show the Google photo (asked at first sign-in, D-27) | `MODERATION_REJECTED`, `CITY_NOT_FOUND` (D-29) |
| `POST /admin/users/{id}/ban`, `.../restrict-chat` | admin | Ban, restrict chat | `FORBIDDEN` |
| `GET /admin/spots?status=pending`, `POST /admin/spots/{id}/approve`, `.../reject` | admin | List custom spots waiting for approval, approve or reject one (R-27) | `FORBIDDEN` |

## Static files

Same CloudFront distribution as the app (no CORS). Not Lambdas. Rate limited per IP at the edge (R-21).

| Path | Holds |
|---|---|
| `/`, `/privacy`, `/terms` | The public landing page, privacy policy and terms: the only pages open without sign-in (R-22) |
| `/locales/he.json`, `/locales/en.json` | All UI strings (D-32) |
