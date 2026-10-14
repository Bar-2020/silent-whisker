# API

Draft. Lambda behind CloudFront. JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status. Every route can also answer
`RATE_LIMITED` (429, with `Retry-After`, R-21).
"Member" means a valid Google sign-in through Cognito. Every route needs one (R-22).

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | member | Approximate spots in the viewport | |
| `GET /spots/{id}/exact` | member | Exact address and coordinates | `LOOKUP_LIMIT` (R-03) |
| `POST /spots` | member | Create a spot | `DAILY_LIMIT` (R-12), `BANNED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `CAP_REACHED` (R-05) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log from `kind`, `amount`, `lat`, `lng`, `accuracy_m`. The answer is only counted or unverified, never the distance | `BANNED`, `ATTEMPT_LIMIT` (R-17), `TOO_SOON` (R-10), `LOG_LIMIT` (R-13) |
| `POST /spots/{id}/empty` | member | Report the food or the water as empty (D-19) | `BANNED`, `ATTEMPT_LIMIT` (R-17), `REFUSED` (R-16, one answer for every failed check) |
| `GET /spots/{id}` | member | Spot detail, approved logs, cats | |
| `POST /cats`, `POST /cats/{id}/like`, `POST /cats/{id}/comments` | member | Cat sighting, like, comment | `BANNED`, `MODERATION_REJECTED` |
| `POST /alerts`, `POST /alerts/{id}/resolve` | member | Raise or resolve an alert | `BANNED` |
| `GET /places?bbox=` | member | Vets and organisations | |
| `GET /messages?scope=&id=`, `POST /messages` | member | Chat | `CHAT_RESTRICTED` (R-08) |
| `POST /reports` | member | Report content | |
| `PATCH /me` | member | Update profile: full name, city, show the Google photo (asked at first sign-in, D-27) | `MODERATION_REJECTED`, `CITY_NOT_FOUND` (D-29) |
| `POST /admin/users/{id}/ban`, `.../restrict-chat` | admin | Ban, restrict chat | `FORBIDDEN` |

## Static files

Same CloudFront distribution as the app (no CORS). Not Lambdas. Rate limited per IP at the edge (R-21).

| Path | Holds |
|---|---|
| `/`, `/privacy`, `/terms` | The public landing page, privacy policy and terms: the only pages open without sign-in (R-22) |
| `/locales/he.json`, `/locales/en.json` | All UI strings (D-32) |
