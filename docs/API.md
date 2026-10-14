# API

Draft. Lambda behind CloudFront. JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status.
"Member" means a valid Google sign-in through Cognito.

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | anyone | Approximate spots in the viewport | |
| `GET /spots/{id}/exact` | member | Exact address and coordinates | `LOOKUP_LIMIT` (R-03) |
| `POST /spots` | member | Create a spot | `DAILY_LIMIT` (R-12), `BANNED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `CAP_REACHED` (R-05) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log | `BANNED`, `TOO_SOON` (R-10) |
| `GET /spots/{id}` | anyone | Spot detail, approved logs, cats | |
| `POST /cats`, `POST /cats/{id}/like`, `POST /cats/{id}/comments` | member | Cat sighting, like, comment | `BANNED`, `MODERATION_REJECTED` |
| `POST /alerts`, `POST /alerts/{id}/resolve` | member | Raise or resolve an alert | `BANNED` |
| `GET /places?bbox=` | anyone | Vets and organisations | |
| `GET /messages?scope=&id=`, `POST /messages` | read: anyone, write: member | Chat | `CHAT_RESTRICTED` (R-08) |
| `POST /reports` | member | Report content | |
| `PATCH /me` | member | Update profile | `MODERATION_REJECTED` |
| `POST /admin/users/{id}/ban`, `.../restrict-chat` | admin | Ban, restrict chat | `FORBIDDEN` |

## Static files

Same CloudFront distribution as the app (no CORS). Not Lambdas.

| Path | Holds |
|---|---|
| `/locales/he.json`, `/locales/en.json` | All UI strings (D-20) |
| `/data/municipal-spots.geojson` | Municipal feeding stations (D-22) |
