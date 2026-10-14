# API

Draft. Lambda behind CloudFront. JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status.
"Member" means a valid Google sign-in through Cognito.

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | anyone | Approximate spots in the viewport | |
| `GET /spots/{id}/exact` | member | Exact address and coordinates | `LOOKUP_LIMIT` (R-03) |
| `POST /spots` | member | Create a spot | `DAILY_LIMIT` (R-12), `BANNED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `CAP_REACHED` (R-05, see D-23) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log from `kind`, `amount`, `lat`, `lng`, `accuracy_m`. The answer is only counted or unverified, never the distance | `BANNED`, `ATTEMPT_LIMIT` (R-17), `TOO_SOON` (R-10, see D-23) |
| `POST /spots/{id}/empty` | member | Report the food or the water as empty (D-19) | `BANNED`, `ATTEMPT_LIMIT` (R-17), `REFUSED` (R-16, one answer for every failed check) |
| `GET /spots/{id}` | anyone | Spot detail, approved logs, cats | |
| `POST /cats`, `POST /cats/{id}/like`, `POST /cats/{id}/comments` | member | Cat sighting, like, comment | `BANNED`, `MODERATION_REJECTED` |
| `POST /alerts`, `POST /alerts/{id}/resolve` | member | Raise or resolve an alert | `BANNED` |
| `GET /places?bbox=` | anyone | Vets and organisations | |
| `GET /messages?scope=&id=`, `POST /messages` | read: anyone, write: member | Chat | `CHAT_RESTRICTED` (R-08) |
| `POST /reports` | member | Report content | |
| `PATCH /me` | member | Update profile: full name, city, show the Google photo (asked at first sign-in, D-27) | `MODERATION_REJECTED` |
| `POST /admin/users/{id}/ban`, `.../restrict-chat` | admin | Ban, restrict chat | `FORBIDDEN` |
