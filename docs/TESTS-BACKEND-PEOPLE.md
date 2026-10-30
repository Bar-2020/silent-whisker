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
| AUTH-06 | i | A banned member calls `DELETE /profile`, then signs in again (the Cognito fake says disabled) | Deleted; the `users` row keeps only `user_id` and `status: banned`; sign-in refused (effect proposed: D-92) | D-71, R-08, D-92 |
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
| PROF-05 | i | Name and city of 1, 2, 35 and 36 characters; in Hebrew, Arabic, Russian; with emoji; only spaces | Counted in characters, not bytes; out of range `INVALID_INPUT`; spaces and emoji per D-92 | D-61 |
| PROF-06 | i | `PATCH /profile` where the text check says rejected | `MODERATION_REJECTED`, nothing saved, the day's allowance stays spent | D-62 |
| PROF-07 | i | The check cannot run: breaker tripped, the call throws, times out or answers nonsense | `503 CHECK_UNAVAILABLE`, nothing saved, allowance given back | D-62, R-05 |
| PROF-08 | i | Six saves in one UTC day, then one at 00:00:00 UTC; six at once | Sixth `DAILY_LIMIT`; reset at midnight; exactly five of the six at once pass | D-61 |
| PROF-09 | i | A city the geocoder does not know, twice; a known city twice; the geocoder down | `CITY_NOT_FOUND`, the check does not run, no spend; the unknown city is not saved, so typos never fill `geocode_cache`, and each try uses the member's allowance; the known city's second call comes from the cache; never a made-up centre | D-29, D-62, D-87 |
| PROF-10 | i | Count the paid calls of one successful `PATCH` | One check for name and city together, through `meteredCall`, after the allowance and the city lookup | D-62, R-05 |
| PROF-11 | i | First save without `accept_terms`, with `false`, with `true` | `INVALID_INPUT`, `INVALID_INPUT`, then UTC `terms_accepted_at` and `terms_version` stored | D-69, R-36 |
| PROF-12 | i | `DELETE /profile` for an active member with photos, comments, messages, alerts, spots, logs and likes | Row and sign-in gone; their photos, comments, messages and alerts `removed`; spots, logs and likes stay with the member id cleared; stats gone (effect proposed: D-92) | D-71, R-07, D-92 |
| PROF-13 | i | `DELETE /profile` before the terms are accepted | Works | R-36 |
| PROF-14 | i | After `DELETE`, call `GET /profile` with the old, still valid ID token | A fresh empty row is made and the member must accept the terms again (accepted: D-92) | D-59, D-71, D-92 |
| PROF-15 | i | Look at the headers of `GET /profile` | Never cached (`Cache-Control: no-store`) | D-59 |
| PROF-16 | i | Ten lookups of different cities in the same second, from several handler instances | One request a second reaches the geocoder (one `geocoder#<second>` row each); the losers wait for the next second, up to 3 tries, then fail; the route decides what the member sees | D-87 |

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
