# API

Draft. CloudFront in front of an API Gateway HTTP API and Lambda (D-38); every path below is served under `/api/` (D-60). JSON. Errors are `{ "code": "SOME_CODE" }` with the HTTP status. A per-member limit answers
`RATE_LIMITED` (429, with `Retry-After`, R-21); the front door's own throttle answers a bare 429 (D-60).
"Member" means a valid Google sign-in through Cognito, sent as the ID token (D-59). Every route needs one (R-22).
A banned member can call only the reads: every `GET` and `POST /cats/feed` (R-08, D-68). A member who has not accepted the current terms can call only `GET`, `PATCH` and `DELETE /profile`; every other route answers `TERMS_REQUIRED` (R-35).

| Method and path | Who | Does | Refusals |
|---|---|---|---|
| `GET /spots?bbox=` | member | Approved spots in the viewport at their exact point: every city station, and the custom spots R-03 allows, using the optional `lat`, `lng`, `accuracy_m` (not stored); plus the caller's own pending ones (R-27) | |
| `POST /spots` | member | Create a custom spot, saved as `pending` (R-27), from either `address` (looked up) or `lat`, `lng`, `accuracy_m` ("my location"), plus optional `name` and `photo_key` (D-43) | `DAILY_LIMIT` (R-12), `ADDRESS_NOT_FOUND` (D-43), `LOCATION_REQUIRED` (D-43), `BANNED`, `MODERATION_REJECTED` |
| `POST /uploads` | member | Presigned URL to the quarantine prefix | `BANNED`, `UPLOAD_LIMIT` (R-30) |
| `POST /spots/{id}/logs` | member | Create a feeding or water log from `kind`, `amount`, `lat`, `lng`, `accuracy_m`. The answer is only counted or unverified, never the distance | `BANNED`, `ATTEMPT_LIMIT` (R-17), `TOO_SOON` (R-10), `LOG_LIMIT` (R-13) |
| `POST /spots/{id}/logs/{log_id}/cancel` | the member who made the log | Cancel your own log within 10 minutes (R-36, D-75); it becomes `removed` and the spot's timers go back | `BANNED`, `NOT_FOUND` (also for someone else's log), `TOO_LATE` |
| `POST /spots/{id}/empty` | member | Report the food or the water as empty (D-19) | `BANNED`, `ATTEMPT_LIMIT` (R-17), `REFUSED` (R-16, one answer for every failed check) |
| `GET /spots/{id}` | member | Spot detail with the exact address, counted logs (unverified ones are not listed, R-09), approved cats with their like counts; a custom spot only as R-03 allows, from the same optional `lat`, `lng`, `accuracy_m` | `NOT_FOUND` (also when R-03 hides it, so a hidden spot looks like a missing one) |
| `POST /cats` | member | Post a cat photo from `photo_key`, a required `name` (R-34), and either `spot_id` (a cat at a spot) or `lat`, `lng` (a random cat; rounded to a neighbourhood cell and not stored; with neither, the profile city is used) (D-44) | `BANNED`, `NAME_REQUIRED` (R-34), `DAILY_LIMIT` (R-25), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cats/feed` | member | The next 20 photos of the feed: recent approved cat photos close by that the member has not seen, most liked first, skipping the ids in `seen` (the photos the app has shown, the last few hundred), then the seen ones again when none are left; each with a place tag and no coordinates (R-28, R-29, D-45). Optional `lat`, `lng`, rounded to a neighbourhood cell (else the profile city); they are not stored. It is a POST only because the `seen` list is too long for a URL; it writes nothing | |
| `POST /cats/{id}/like` | member | Like, or take the like back (R-26) | `BANNED` |
| `POST /cats/{id}/remove`, `POST /cats/{id}/comments/{comment_id}/remove`, `POST /spots/{id}/messages/{message_id}/remove` | the author | Remove your own photo, comment or chat message (R-37, D-76); never a hard delete | `BANNED`, `NOT_FOUND` (also for someone else's) |
| `GET /cats/{id}/comments`, `POST /cats/{id}/comments` | member | Read or write comments | `BANNED`, `CHAT_RESTRICTED` (R-08), `DAILY_LIMIT` (R-25), `MODERATION_REJECTED` |
| `GET /cat-alerts?bbox=` | member | Cat alerts shown under R-24, with their exact point (D-47); the map and the list use the same answer. With `past=1`, the alerts that expired in the last 7 days, for every member | |
| `GET /cat-alerts/{id}` | member | One alert, for its own page (D-79), when R-24 shows it to members (past alerts included) | `NOT_FOUND` |
| `POST /cat-alerts` | member | Raise a cat alert from `kind` (`danger`, `sick` or `neuter`), `lat`, `lng`, `accuracy_m`, `note`, `photo_key` (D-41) | `BANNED`, `DAILY_LIMIT` (R-23), `LOCATION_REQUIRED` (R-23, missing or too vague), `NO_CAT_IN_PHOTO` (R-25), `MODERATION_REJECTED` |
| `POST /cat-alerts/{id}/resolve` | the member who raised it, or an admin | Hide a cat alert now (D-80) | `FORBIDDEN`, `ALREADY_RESOLVED` (R-24), `BANNED` |
| `POST /cat-alerts/{id}/extend` | admin | Extend a cat alert (12 hours, or 7 days for `neuter`, any number of times; also while it is in the past list) | `FORBIDDEN`, `ALREADY_RESOLVED` (R-24) |
| `GET /spots/{id}/messages`, `POST /spots/{id}/messages` | member | Chat of a spot (D-48) | `BANNED`, `CHAT_RESTRICTED` (R-08), `CHAT_PAUSED` (R-33), `MODERATION_REJECTED` |
| `GET /search?q=` | member | Spots by name, as the member types, that R-03 lets them see; with `places=1`, also cities, streets and addresses from the cached geocoder (D-29). The app asks for places only when the member submits, because the geocoder does not allow autocomplete. No match is an empty list | |
| `PATCH /spots/{id}` | creator or admin | Rename a custom spot, or set `active`. From the creator, `active: false` is saved as a request and the spot stays active (R-32); from an admin it applies at once | `FORBIDDEN`, `NOT_FOUND`, `MODERATION_REJECTED` |
| `POST /reports` | member | Report content (`target_type`, `target_id`: it is hidden from the reporter at once), or a spot problem (`target_type` `spot`, a `reason`: `wrong_place`, `gone`, `duplicate` or `other`: nothing is hidden). One report per member per item (D-77) | `BANNED`, `INVALID_INPUT` |
| `GET /profile` | member | The caller's profile: name, city, photo choice, `status` and whether the current terms were accepted. The first call after sign-in creates it from the token (D-59), with no name or city yet. A banned member still gets it, so the app can say so | |
| `PATCH /profile` | member | Update profile: full name and city (2 to 35 characters each, D-61), show the Google photo (asked at first sign-in, D-27), and `accept_terms: true` (required on the first save, and again when the terms change, D-65). Name and city are checked on the spot and saved only if the check passes (D-62) | `BANNED`, `DAILY_LIMIT` (5 saves a day, D-61), `INVALID_INPUT` (also a missing `accept_terms`), `MODERATION_REJECTED`, `CITY_NOT_FOUND` (D-29), `CHECK_UNAVAILABLE` (503: the check cannot run, the spending cap is reached or AWS is down, D-62) |
| `DELETE /profile` | member | Delete the account (D-67): the member's name and sign-in go, their content is removed or made anonymous. Works before the terms are accepted. A banned member asks by email instead (D-67) | `BANNED` |
| `POST /admin/users/{id}/ban`, `.../unban`, `.../restrict-chat`, `.../unrestrict-chat` | admin | Ban or restrict chat, and undo either (D-77) | `FORBIDDEN` |
| `GET /admin/reports?status=open` | admin | Open reports, content and spot problems, each with its `reason` and the target's exact point when it has one, so the app sorts them by distance (D-74, D-77) | `FORBIDDEN` |
| `POST /admin/reports/{target_id}/hide`, `.../keep` | admin | Close every open report on an item: hide the item for everyone, or keep it. `hide` is for content only; a spot problem is closed with `keep` after the admin acted, for a custom spot through `PATCH /spots/{id}` (D-77) | `FORBIDDEN`, `INVALID_INPUT` |
| `GET /admin/spots?status=pending`, `POST /admin/spots/{id}/approve`, `.../reject` | admin | List custom spots waiting for approval and the inactive requests on custom spots, approve or reject one (R-27, R-32) | `FORBIDDEN` |
| `POST /admin/spots/{id}/pause-chat`, `.../resume-chat` | admin | Pause or resume the chat of a spot (R-33) | `FORBIDDEN` |

## Static files

Same CloudFront distribution as the app (no CORS). Not Lambdas. No per-IP limit: there is no WAF for now (R-21, D-38).

| Path | Holds |
|---|---|
| `/`, `/privacy`, `/terms` | The public landing page, privacy policy and terms: the only pages open without sign-in (R-22) |
| `/locales/he.json`, `/locales/en.json`, `/locales/ar.json`, `/locales/ru.json` | All UI strings (D-32, D-81) |
| `/manifest.webmanifest` and its icons | What the browser needs to install the app (D-01) |

## App pages

Drawn in the browser; CloudFront serves `index.html` for any address without a file extension (D-63). Every one
needs a sign-in: a visitor who opens a link is sent to Google and then lands on that page (D-79).

| Path | Opens |
|---|---|
| `/spots/{spot_id}` | One spot (a link a member can share; it opens only if R-03 shows the spot to the person who opens it) |
| `/alerts/{cat_alert_id}` | One cat alert (while R-24 shows it) |
| `/profile`, `/auth/callback` | Profile; the sign-in return (D-59) |

The paths of the map and the other tabs are chosen when they are built. An id in an address has no dot (D-63): a municipal `spot_id` is its source id and a hash, never a name with a dot.
