# API

Draft. CloudFront in front of an API Gateway HTTP API and Lambda (D-38); every path below is served under `/api/` (D-60). JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status. A per-member limit answers
`RATE_LIMITED` (429, with `Retry-After`, R-21); the front door's own throttle answers a bare 429 (D-60).
"Member" means a valid Google sign-in through Cognito, sent as the ID token (D-59). Every route needs one (R-22).

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | member | Approved spots in the viewport at their exact point: every city station, and the custom spots R-03 allows, using the optional `lat`, `lng`, `accuracy_m` (not stored); plus the caller's own pending ones (R-27) | |
| `POST /spots` | member | Create a custom spot, saved as `pending` (R-27), from either `address` (looked up) or `lat`, `lng`, `accuracy_m` ("my location"), plus optional `name` and `photo_key` (D-43) | `DAILY_LIMIT` (R-12), `ADDRESS_NOT_FOUND` (D-43), `LOCATION_REQUIRED` (D-43), `BANNED`, `MODERATION_REJECTED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `UPLOAD_LIMIT` (R-30) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log from `kind`, `amount`, `lat`, `lng`, `accuracy_m`. The answer is only counted or unverified, never the distance | `BANNED`, `ATTEMPT_LIMIT` (R-17), `TOO_SOON` (R-10), `LOG_LIMIT` (R-13) |
| `POST /spots/{id}/empty` | member | Report the food or the water as empty (D-19) | `BANNED`, `ATTEMPT_LIMIT` (R-17), `REFUSED` (R-16, one answer for every failed check) |
| `GET /spots/{id}` | member | Spot detail with the exact address, counted logs (unverified ones are not listed, R-09), approved cats with their like counts; a custom spot only as R-03 allows, from the same optional `lat`, `lng`, `accuracy_m` | `NOT_FOUND` (also when R-03 hides it, so a hidden spot looks like a missing one) |
| `POST /cats` | member | Post a cat photo from `photo_key`, a required `name` (R-34), and either `spot_id` (a cat at a spot) or `lat`, `lng` (a random cat; rounded to a neighbourhood cell and not stored; with neither, the profile city is used) (D-44) | `BANNED`, `NAME_REQUIRED` (R-34), `DAILY_LIMIT` (R-25), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cats/feed` | member | The next 20 photos of the feed: recent approved cat photos close by that the member has not seen, most liked first, skipping the ids in `seen` (the photos the app has shown, the last few hundred), then the seen ones again when none are left; each with a place tag and no coordinates (R-28, R-29, D-45). Optional `lat`, `lng`, rounded to a neighbourhood cell (else the profile city); they are not stored. It is a POST only because the `seen` list is too long for a URL; it writes nothing | |
| `POST /cats/{id}/like` | member | Like, or take the like back (R-26) | `BANNED` |
| `GET /cats/{id}/comments`, `POST /cats/{id}/comments` | member | Read or write comments | `BANNED`, `CHAT_RESTRICTED` (R-08), `DAILY_LIMIT` (R-25), `MODERATION_REJECTED` |
| `GET /cat-alerts?bbox=` | member | Cat alerts shown under R-24, with their exact point (D-47); the map and the list use the same answer. With `past=1`, the alerts that expired in the last 7 days, for every member | |
| `POST /cat-alerts` | member | Raise a cat alert from `kind` (`danger`, `sick` or `neuter`), `lat`, `lng`, `accuracy_m`, `note`, `photo_key` (D-41) | `BANNED`, `DAILY_LIMIT` (R-23), `LOCATION_REQUIRED` (R-23, missing or too vague), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cat-alerts/{id}/resolve`, `POST /cat-alerts/{id}/extend` | admin | Hide a cat alert now, or extend it (12 hours, or 7 days for `neuter`, any number of times; also while it is in the past list) | `FORBIDDEN`, `ALREADY_RESOLVED` (R-24) |
| `GET /spots/{id}/messages`, `POST /spots/{id}/messages` | member | Chat of a spot (D-48) | `BANNED`, `CHAT_RESTRICTED` (R-08), `CHAT_PAUSED` (R-33), `MODERATION_REJECTED` |
| `GET /search?q=` | member | Spots by name, as the member types, that R-03 lets them see; with `places=1`, also cities, streets and addresses from the cached geocoder (D-29). The app asks for places only when the member submits, because the geocoder does not allow autocomplete. No match is an empty list | |
| `PATCH /spots/{id}` | creator or admin | Rename a custom spot, or set `active`. From the creator, `active: false` is saved as a request and the spot stays active (R-32); from an admin it applies at once | `FORBIDDEN`, `NOT_FOUND`, `MODERATION_REJECTED` |
| `POST /reports` | member | Report content | |
| `GET /profile` | member | The caller's profile: name, city, photo choice and `status`. The first call after sign-in creates it from the token (D-59), with no name or city yet. A banned member still gets it, so the app can say so | |
| `PATCH /profile` | member | Update profile: full name and city (2 to 35 characters each, D-61), show the Google photo (asked at first sign-in, D-27). Name and city are checked on the spot and saved only if the check passes (D-62) | `BANNED`, `DAILY_LIMIT` (5 saves a day, D-61), `INVALID_INPUT`, `MODERATION_REJECTED`, `CITY_NOT_FOUND` (D-29), `CHECK_UNAVAILABLE` (503: the check cannot run, the spending cap is reached or AWS is down, D-62) |
| `POST /admin/users/{id}/ban`, `.../restrict-chat` | admin | Ban, restrict chat | `FORBIDDEN` |
| `GET /admin/spots?status=pending`, `POST /admin/spots/{id}/approve`, `.../reject` | admin | List custom spots waiting for approval and the inactive requests on custom spots, approve or reject one (R-27, R-32) | `FORBIDDEN` |
| `POST /admin/spots/{id}/pause-chat`, `.../resume-chat` | admin | Pause or resume the chat of a spot (R-33) | `FORBIDDEN` |

## Static files

Same CloudFront distribution as the app (no CORS). Not Lambdas. No per-IP limit: there is no WAF for now (R-21, D-38).

| Path | Holds |
|---|---|
| `/`, `/privacy`, `/terms` | The public landing page, privacy policy and terms: the only pages open without sign-in (R-22) |
| `/locales/he.json`, `/locales/en.json` | All UI strings (D-32) |
