# Test scenarios: people and access

Layers, how to cite and how limits are tried: [TESTING.md](TESTING.md). Whether a limit itself is inside is open (D-92).

## Who may call (AUTH)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| AUTH-01 | i | Call each route with no verified claims (what the authorizer would have stopped) | `401 UNAUTHORIZED`, nothing read or written | R-22 |
| AUTH-02 | i | Call each route with an access token (`token_use: access`) instead of an ID token | `401 UNAUTHORIZED` on all of them | R-22, D-59 |
| AUTH-03 | i | Send `user_id`, `created_by` or `status` in a body or query that is not the token's `sub` | Ignored: the action is done as the token's member | D-59, R-01 |
| AUTH-04 | i | A banned member calls every write route in `API.md` (table-driven from the doc) | `BANNED`, no row, no counter moved | R-08 |
| AUTH-05 | i | The same member calls every `GET` and `POST /cats/feed` | They work, and the feed writes nothing | R-08, D-72 |
| AUTH-06 | i | A banned member calls `DELETE /profile` with `confirm: true` | `deleted: true`; the `users` row keeps `user_id`, `status: banned` and `deleted_at`, every other attribute gone; the Cognito user is disabled, never deleted (`AdminDisableUser` is called, `AdminDeleteUser` is not), so signing in again is refused | D-71, R-08, D-109, D-112 |
| AUTH-07 | i | A member who has not accepted the terms calls every route | Only `GET`, `PATCH` (with `accept_terms`) and `DELETE /profile` work; the rest `TERMS_REQUIRED` | R-36 |
| AUTH-08 | i | Raise `terms_version`, then an accepted member calls `GET /spots` | `TERMS_REQUIRED` until `PATCH /profile` with `accept_terms: true` | R-36, D-69 |
| AUTH-09 | i | A member who is banned and has not accepted the terms calls a write, then a read | One answer each, as D-92 settles (recommended: `BANNED` on writes, `TERMS_REQUIRED` on reads) | R-08, R-36, D-92 |
| AUTH-10 | i | A non-admin calls every `/admin/*` route, `extend`, `approve`, `pause-chat` | `FORBIDDEN`, nothing changed | D-78, R-27 |
| AUTH-11 | i | Clear `is_admin` on an admin's row, then the admin calls an admin route with the same token | `FORBIDDEN` at once: the flag is read from the row, not the token | D-78 |
| AUTH-12 | i | A banned admin calls a write route | `BANNED`: R-08 has no admin exception | R-08 |
| AUTH-13 | i | `PATCH /profile` with `is_admin`, `status`, `avatar_url`, counters and `terms_version` in the body | Those fields are never written | D-21, D-78 |

## Profile and account (PROF)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| PROF-01 | i | First `GET /profile` with a valid ID token | Row made: `active`, `show_google_photo` false, `is_admin` false, zero counters, UTC `created_at`, no name or city, terms not accepted | D-59 |
| PROF-02 | i | Two first `GET /profile` at the same moment | One row, two `200` | D-59 |
| PROF-03 | i | Later `GET` with the same picture; a new picture on Google's host; one on another host or plain `http://` | No write; updated; not copied | D-21 |
| PROF-04 | i | Read the answer with `show_google_photo` false, then true; read another member's name on a post | `avatar_url` is `null` unless chosen; only name and chosen photo are shown to others | D-21, D-70 |
| PROF-05 | i | Name of 2, 3, 35 and 36 characters (D-116: the name needs 3); in Hebrew, Arabic, Russian; with emoji; only spaces | Counted in characters, not bytes; out of range `INVALID_INPUT`; a name with emoji is `INVALID_INPUT` (D-116) | D-61, D-116 |
| PROF-06 | i | `PATCH /profile` where the text check says rejected | `MODERATION_REJECTED`, nothing saved, the day's allowance stays spent | D-62 |
| PROF-07 | i | The check cannot run: breaker tripped, the call throws, times out or answers nonsense | `503 CHECK_UNAVAILABLE`, nothing saved, allowance given back | D-62, R-05 |
| PROF-08 | i | Six saves in one UTC day, then one at 00:00:00 UTC; six at once | Sixth `PROFILE_SAVE_DAILY_LIMIT` with `Retry-After`; reset at midnight; exactly five of the six at once pass | D-61 |
| PROF-09 | i | `PATCH /profile` with a `city_id` that is on the list; one that is not (999999, 0, -1, 1.5, "5000", null); a first save with a name and no `city_id` | A listed code is saved as `city_id` and nothing else about the city (no `city`, `city_lat` or `city_lng`), and no outside lookup is made; the others `INVALID_INPUT`, nothing saved, no paid check and no allowance spent; a first save without a city is `INVALID_INPUT` | D-117 |
| PROF-10 | i | Count the paid calls of one successful `PATCH` that changes the name, and one that changes only the city | One check for the name, through `meteredCall`, after the allowance; a save that changes only the city, the photo answer or the terms makes none and takes no allowance | D-62, D-117, R-05 |
| PROF-11 | i | First save without `accept_terms`, with `false`, with `true` | `INVALID_INPUT`, `INVALID_INPUT`, then UTC `terms_accepted_at` and `terms_version` stored | D-69, R-36 |
| PROF-12 | i | `DELETE /profile` with `confirm: true` for an active member | The row is erased and marked in one update (only `user_id`, `status: active` and `deleted_at`, a UTC time, are left); then the Cognito user is deleted (`AdminDeleteUser`, called with the token's `cognito:username`, and `AdminDisableUser` is not called), so the same Google account can sign up again as a new member; `deleted: true`. Phase 2 has only these; the phase that builds each other table (photos, comments, messages, alerts, spots, logs, likes) adds its effect here: their photos, comments, messages and alerts `removed`, spots, logs and likes kept with the member id cleared, stats gone (D-109) | D-71, R-07, D-109 |
| PROF-13 | i | `DELETE /profile` with `confirm: true` before the terms are accepted, and as a caller with no row yet | Works; the caller with no row gets a row holding only `user_id`, `status: active` and `deleted_at` | R-36, D-109 |
| PROF-14 | i | After `DELETE` (active or banned member), call every route in `API.md` (table-driven from the doc) with the old, still valid ID token | `401 UNAUTHORIZED` from each, nothing written, no row made; the same call with another member's token still works (D-109, replaces D-92) | D-59, D-71, D-109 |
| PROF-15 | i | Look at the headers of `GET /profile` | Never cached (`Cache-Control: no-store`) | D-59 |
| PROF-16 | i | Ten lookups of different cities in the same second, from several handler instances | One request a second reaches the geocoder (one `geocoder#<second>` row each); the losers wait for the next second, up to 3 tries, then fail; the route decides what the member sees | D-87 |
| PROF-17 | t | The profile save Lambda in Terraform | It is the route `PATCH /api/profile` with the authorizer and its throttle (1 a second, burst 2); its role reads and updates `users` only (no delete, no wildcard), reaches the geocode cache, the counters, the cost alert topic and the text moderation guardrail; its six settings are wired | D-62, D-61, R-22 |
| PROF-18 | i | `GET /profile` with a changed Google picture, while the member's row is deleted after the handler read it | The photo update is conditional on the row still existing, so it can never make a row holding only `user_id` and `avatar_url`; when it finds the row gone, a fresh empty row is made as in PROF-14, with the new photo, and the answer is `200` | D-59, D-92 |
| PROF-19 | i | `PATCH /profile` with a name made only of characters that draw nothing: Hangul fillers, braille blanks, variation selectors, zero-width spaces; and the same characters next to a letter | The first group `INVALID_INPUT`, nothing saved, no paid check; for a name (D-116) the second group, emoji and braille text are `INVALID_INPUT`, and real Hebrew with points, Arabic or Persian with a joiner (half-space), Hebrew with a right-to-left mark and Russian are saved | D-61, D-92, D-116 |
| PROF-20 | i | `GET /profile` by a banned member whose Google picture changed; and by an active member who is banned after the handler read the row | No photo is written for a banned member (D-71) and the answer is still `200`, as for any banned member (API.md); when the ban lands between the read and the photo update, the database refuses the update and the banned row comes back as it is, never replaced by a fresh one | D-71, D-21 |
| PROF-21 | i | `DELETE /profile` with `confirm: false` for an active member, a banned member and a caller with no row | `200 { "deleted": false }`; the row, the Cognito user and every counter are untouched, and no Cognito call is made | D-71, D-109 |
| PROF-22 | i | `DELETE /profile` with no body, `{}`, `{ "confirm": "true" }`, `{ "confirm": null }` and a body that is not JSON | `400 INVALID_INPUT` each time; nothing written | D-101, D-109 |
| PROF-23 | i | `confirm: true` for a member whose daily writes (`WRITES_PER_DAY`) are used up, for one with the counter untouched, and `confirm: false` | The delete works in both cases; neither call reads or moves the write counter (D-109: deleting must work with no units left, and the token is dead after it) | R-21, D-109 |
| PROF-24 | i | `confirm: true` where the Cognito call fails after the row was erased; then any call with the same token, and a new sign-in's token for the same member | The first answers a server error; every later call, with either token, answers `401 UNAUTHORIZED` (the row is marked), so the leftover Cognito user (still enabled for an active member, or still enabled for a banned one) is harmless | D-109, D-112 |
| PROF-25 | i | `confirm: true` for a member who is banned after the handler read the row, and for one who is unbanned; and a member whose row has a `status` other than banned | The update never writes `status` of an existing row: a banned member stays banned, an active one stays active; the Cognito call follows the `status` the update returns, not the one read first: disabled for a banned member (also one banned after the handler's first read), deleted for an active one | D-71, R-08, D-109, D-112 |
| PROF-26 | i | `confirm: true` with a body that holds a `username` or `user_id` of someone else; a token with no `cognito:username` | Cognito is called only with the token's `cognito:username`, and the body is ignored; the token without it answers `401 UNAUTHORIZED` and nothing is touched | R-01, R-22, D-109 |
| PROF-27 | t | The delete Lambda in Terraform | It is the route `DELETE /api/profile` with the authorizer and its throttle (1 a second, burst 2); its role may get and update in `users`, and disable or delete users of this user pool only: no `PutItem`, no `DeleteItem`, no other Cognito action, no wildcard resource; its two settings USERS_TABLE and USER_POOL_ID are wired | R-21, R-22, D-60, D-109, D-112 |
| PROF-28 | i | The deleted mark: after a successful delete, read the row | It has `deleted_at` as a UTC ISO time and no other attribute but `user_id` and `status`; a mark on one member never affects another; `GET /profile` for a caller whose delete lands between its read and its photo write answers `401` and the photo is not written | D-109 |
| PROF-29 | i | After a successful `confirm: true`, call `DELETE /profile` again with the same token, with `confirm: true` and with `confirm: false` | `401 UNAUTHORIZED` both times; nothing is written and Cognito is not called | D-109 |
| PROF-30 | u | Read every `backend/*/handler.ts` as text | Each gets its member through `requireLiveMember` and none calls `verifiedClaims` itself, so a new route cannot forget the deleted-account check (D-109) | D-109, R-22 |
| PROF-31 | i | `confirm: true` for an active member whose Cognito user is already gone (`UserNotFoundException`), then for a banned member whose Cognito user is already gone | Both answer `deleted: true`: a user Cognito no longer knows counts as done, for the delete and for the disable | D-112 |
| PROF-32 | i | `PATCH /profile` with a `display_name` of: 2 letters; "Dana  Levi" (two spaces); "Dana2"; "Dana 😀"; "Dana_Levi"; "דנה לוי"; "Анна"; "سارة"; "Dana Levi 99"; "Aaa Bbb"; "Dana Lllevi"; "---"; "Test"; "admin cohen"; "ADMIN"; "בדיקה"; "Tom-Ali"; "D'Souza"; "O.K. Lee"; a Persian name with a half-space; Hebrew with a right-to-left mark; a letter with Hangul fillers or a variation selector next to it; two braille letters | `INVALID_INPUT` and nothing saved for 2 letters, "Dana2", the emoji one, the underscore one, "Dana Levi 99", "Aaa Bbb", "Dana Lllevi", "---", "Test", "Test.", "admin cohen", "ADMIN", "בדיקה", the fillers and braille ones; saved for the others, with the two spaces turned into one | D-116, R-01 |
| PROF-33 | u | Read `shared/constants/cities.json` | Every entry has a positive whole `id`, unique over the list, and a Hebrew and an English name; the names that are present are not empty or padded with spaces; a position, when present, is inside Israel's bounds (latitude 29 to 34, longitude 34 to 36); the list parses with the city schema; it holds the well-known places (Tel Aviv - Yafo 5000, Jerusalem 3000, Haifa 4000, Be'er Sheva 9000) with their codes and names in all four languages | D-117 |
| PROF-34 | i | `DELETE /profile` with `confirm: true` for a member whose row still holds the attributes older saves wrote: a typed `city`, `city_lat` and `city_lng` (D-117 retired them) beside `city_id` and the name | The update removes those three too: the row keeps only `user_id`, `status` and `deleted_at`, so no personal data of the typed city outlives the account | D-71, D-117 |

## Admin and reports (ADM)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| ADM-01 | i | An admin bans, unbans, bans twice, restricts chat, unrestricts | `status` and `chat_restricted_until` follow; repeats change nothing and do not fail | D-81, R-08 |
| ADM-02 | i | Chat restriction until T: post at T minus 1 s, and at T | `CHAT_RESTRICTED`, then allowed | R-08 |
| ADM-03 | i | A restricted member reads, and removes their own comment and message | Allowed | R-08, R-38 |
| ADM-04 | i | `GET /admin/reports?status=open` as admin and as member | Content and spot reports with `reason` and the target's exact point; member `FORBIDDEN` | D-81, D-78 |
| ADM-05 | i | A member reports a post, a comment, a message; reports one again | Gone from their lists at once, still shown to others; no second report row | D-81 |
| ADM-06 | i | Report a spot with each reason, none and `foo`; send a `reason` for a post | Four reasons accepted and nothing hidden; the rest `INVALID_INPUT` | D-81 |
| ADM-07 | i | An admin `hide`s a post with three reports, `keep`s another, `hide`s a spot target | Reports closed and the post hidden for everyone; kept; `INVALID_INPUT` | D-81 |
| ADM-08 | i | An admin approves, rejects a pending spot; again; approves one already approved | `approved` (visible per R-03) or stays hidden and takes no logs; repeats change nothing | R-27 |
| ADM-09 | i | An admin changes the name and `active` of a custom spot, then of a city station | Applies at once; the station is `FORBIDDEN` | R-32, R-20 |
| ADM-10 | i | An admin pauses a spot's chat, posts as admin, reads, resumes | `CHAT_PAUSED` for everyone; reads work; resume works | R-33 |

## Hostile and broken input (ROB)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| ROB-01 | i | Every route: malformed JSON, empty body, wrong content type, oversized body | A `4xx` with a code, never `500`; nothing saved | R-01 |
| ROB-02 | i | Every route with an `{id}`: unknown, malformed, an id of another table, another member's item | `NOT_FOUND` or `INVALID_INPUT`, never a stack trace | R-01 |
| ROB-03 | i | Extra fields in any body: `status`, `counted`, `like_count`, `expires_at`, `created_by`, `distance_m` | Ignored and never stored | R-01 |
| ROB-04 | i | Coordinates as a string, `NaN`, `Infinity`, latitude 91, longitude -181, accuracy 0 or negative | `INVALID_INPUT`; on a log, absent coordinates are saved unverified, impossible ones are `INVALID_INPUT` (open: D-92) | R-09, D-92 |
| ROB-05 | i | Text fields: empty, spaces, 10,000 characters, a null byte, `U+202E`, zero-width joiners, markup, `{"$ne":1}`, DynamoDB reserved words | Refused, or stored inert and returned as plain JSON strings | R-04 |
| ROB-06 | i | Make the database throw (access denied, throttled, timeout) on each route | `5xx` with `{ "code" }` only: no table name, ARN or SDK message | R-01 |
| ROB-07 | i | Make the second write of a two-write route fail (a log then the spot's timers, a like then its count) | Both happened or neither; counters never disagree with rows | R-09, R-26 |
| ROB-08 | i | Clock at 23:59:59.999 and 00:00:00.000 UTC, under two time zones, for every daily counter | The day is the UTC day | R-06 |
