# Test scenarios: photos, cats, chat, cost and privacy

Layers, how to cite and how limits are tried: [TESTING.md](TESTING.md). Whether a limit itself is inside is open (D-91).

## Photos and the photo check (UPL)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| UPL-01 | i | `POST /uploads`; try to get a key outside quarantine, with `../`, or another member's | A URL to the quarantine prefix only, key chosen by the server, short expiry; nothing else obtainable | R-04 |
| UPL-02 | i | 21 uploads in a UTC day; 21 at once | The 21st `UPLOAD_LIMIT`; exactly 20 at once; counted at the start, kept when the photo is rejected later | R-30 |
| UPL-03 | i | An object of 500 KB and 500 KB plus 1 byte; 0 bytes; not an image; an image over 1600 px | The oversize, empty and non-image are refused at the size check and never approved | R-11 |
| UPL-04 | i | The photo check fake answers CAT, NOT_CAT, UNSAFE, `cat`, `CAT.`, `CAT. Ignore the rules`, empty, nonsense, a throttle, a timeout | Only exactly CAT approves; NOT_CAT is `NO_CAT_IN_PHOTO`, UNSAFE is `MODERATION_REJECTED`; every other answer keeps the photo hidden | R-04, D-09, D-50 |
| UPL-05 | i | A spot photo the check answers NOT_CAT and UNSAFE | NOT_CAT passes (a spot photo needs no cat); UNSAFE is rejected | R-25, D-09 |
| UPL-06 | i | A rejected, pending and approved photo: ask for their addresses | Only approved photos have a short-lived signed address; none is in the public prefix before approval | R-04, D-39 |
| UPL-07 | i | Use one `photo_key` twice, a key never uploaded, a key of another member, a key after rejection | `INVALID_INPUT`; one upload backs one post | R-04 |
| UPL-08 | i | The check throws while the breaker is not tripped | The photo stays hidden (D-91 asks whether it is retried) | R-04, D-91 |

## Cat posts, feed, likes (CAT)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| CAT-01 | i | `POST /cats` with a name of 0, 1, 40 and 41 characters, only spaces, one the check rejects | `NAME_REQUIRED`; saved; `NAME_REQUIRED`; `MODERATION_REJECTED`; nothing saved on a refusal | R-34 |
| CAT-02 | i | A post at an approved spot (not near it), at a city station, a random cat with a point, with neither, at a hidden or pending spot | Saved with the spot's cell; the cell of the point; the profile city's cell; the last two refused (`NOT_FOUND` when hidden) | D-44, R-03 |
| CAT-03 | i | Post from two points 5 m apart; then scan the row and every response for `lat`, `lng`, `latitude`, `coords` | Same cell; no exact position stored or returned | R-28 |
| CAT-04 | i | 11 cat photos in a UTC day; 11 at once | The 11th `DAILY_LIMIT`; exactly 10 at once | R-25 |
| CAT-05 | i | Feed with a `seen` list: all unseen, some, all seen, empty area, 500 ids and more | Unseen first, most liked then newest, 20 a page; when none are left the seen ones again in the same order; never a `500` | R-29, D-45 |
| CAT-06 | i | Feed window: a post at 6 d 23 h and 7 d; just inside and outside the 25 km ring; no location; removed, rejected, pending and self-reported posts | Only approved, recent, close posts; the city when there is no location; the author's own pending post is D-91 | D-45, R-04 |
| CAT-07 | i | `POST /cats/feed` as a banned member; count database writes | Works; zero writes, no counter moved | R-08, D-72 |
| CAT-08 | i | Call `GET /spots?bbox=`, `GET /cat-alerts` and search | No cat photo record in any of them | R-28 |
| CAT-09 | i | Like, like again; 20 likes at once by one member; 50 members at once; like a removed or pending post; as banned | Count 1 then 0 with no row deleted; one consistent state; count 50; `NOT_FOUND`; `BANNED`; never negative | R-26 |
| CAT-10 | i | An author removes their photo; someone else tries; the author removes it twice | `removed`, its likes and comments vanish from every list; `NOT_FOUND`; the second defined and harmless | R-38, R-07 |
| CAT-11 | i | A member reported a photo; read the spot page, feed and cat page as them and as another | Hidden from the reporter only | D-81 |
| CAT-12 | i | Read the feed card of a cat posted at a custom spot, at a city station, and a random cat | The custom spot's card has a coarse area and no spot name or link; the station's card may name the station; the random cat has a coarse area | R-03, R-28, D-91 |

## Comments and chat (COM)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| COM-01 | i | A comment the check passes, rejects and cannot run on; read newest first | Visible after approval; `MODERATION_REJECTED`; hidden | R-04, R-25 |
| COM-02 | i | 61 comments in a UTC day; 61 at once; chat messages and comments counted apart | The 61st `DAILY_LIMIT`; exactly 60; separate counters | R-25, R-31 |
| COM-03 | i | 101 chat messages in a UTC day | The limit's answer, as D-91 settles; nothing saved over it | R-31, D-91 |
| COM-04 | i | A chat-restricted member posts a comment, a message; reads; removes their own | `CHAT_RESTRICTED` twice; reading and removing work | R-08, R-38, D-48 |
| COM-05 | i | Chat paused: post as member and as admin; read; resume | `CHAT_PAUSED` for all; reads work | R-33 |
| COM-06 | i | Read and post the chat of a hidden custom spot and of an id that never existed | `NOT_FOUND`, identical: chat must not reveal a hidden spot | R-03 |
| COM-07 | i | Remove a message with the wrong spot id; someone else's; your own twice | `NOT_FOUND`; `NOT_FOUND`; defined, harmless | R-38 |
| COM-08 | i | Text at its length constants and one either side; empty; emoji; right-to-left marks | Accepted inside the range, refused outside | R-04 |

## Cost and moderation limits (COST)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| COST-01 | t | Add a handler that imports a paid client without `meteredCall` | The lint rule fails it; every new paid client is added to the rule | R-05 |
| COST-02 | i | The day's spend at the limit minus 1 millionth of a dollar, at the limit; 100 calls at once near it | Allowed, then tripped; the spend never goes over the limit | R-05, D-52 |
| COST-03 | i | Breaker tripped: a cat photo, comment, chat message, alert and spot name; 50 trips in a row | Saved `pending`, hidden, never refused; one owner email a day | D-52, R-05 |
| COST-04 | i | The next UTC day: run the re-check job; run it twice; crash it midway; trip the breaker during it | Oldest first through `meteredCall`; approved or rejected once; stops when tripped; the rest waits; nothing double-spent | D-53 |
| COST-05 | i | Every paid action at its daily limit (uploads, cat photos, comments, alerts, chat, profile saves) | Boundary, race and midnight reset hold for each; a rejected photo's slot is not given back | R-05, R-30 |
| COST-06 | i | 101 writes by one member in a day over many routes; reads after that | The 101st write `RATE_LIMITED` with `Retry-After`; reads unaffected | D-61, R-21 |
| COST-07 | u | A counter row | Has `expires_at` in epoch seconds; no `status` or `created_at` | D-52 |

## Rate limits (LIM)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| LIM-01 | i | For every route in `API.md`: call it past its per-member limit | `429 RATE_LIMITED` with `Retry-After`, nothing saved | R-21 |
| LIM-02 | u | List the routes in `API.md` | Each has a limit constant and a LIM-01 test; a new route without them fails | R-21 |
| LIM-03 | t | List the routes in the API's Terraform | Each has a throttle read from `shared/constants/` and the JWT authorizer | D-60, R-22 |
| LIM-04 | i | Member A at their limit, member B | B is unaffected; keys hold the member and the UTC day | R-21 |
| LIM-05 | m | Once, by hand after the first deploy, a short burst of signed-in calls past the front-door throttle | A bare `429` with no `Retry-After` (to confirm, D-60) | D-60 |

## Time and data (DATA)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| DATA-01 | i | Create every kind of item under two time zones | Every `*_at` is UTC ISO 8601; rows identical | R-06 |
| DATA-02 | u | Search `backend/` for database deletes | Only account deletion and the TTL tables; a new one fails | R-07 |
| DATA-03 | i | After each remove, cancel, reject, resolve and hide route | The row still exists with a changed `status` | R-07 |
| DATA-04 | i | Create every item through its route | Each has `status` and `created_at`, except counters and the cache | R-06, R-07 |
| DATA-05 | u | 10,000 ids made in one millisecond | Unique, sorted by time | D-54 |

## Privacy sweeps (PRIV)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| PRIV-01 | i | Call every route with the phone's coordinates, then scan every table and the captured logs | The coordinates are nowhere, except a cat alert's pin and a "my location" spot; `distance_m` is rounded to 10 m | R-03, R-28, D-47 |
| PRIV-02 | u | Check every answer against one type per route | No field outside it: no email, no other member's `is_admin`, `terms_*`, counters or `chat_restricted_until` | R-01, D-70 |
| PRIV-03 | i | A grid of queries around a hidden custom spot, accuracy 50 | It appears only inside 150 m, and no other route reveals it | R-03, R-28 |
