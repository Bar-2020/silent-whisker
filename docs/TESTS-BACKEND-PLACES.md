# Test scenarios: spots, logs and cat alerts

Layers, how to cite and how limits are tried: [TESTING.md](TESTING.md). Whether a limit itself is inside is open (D-92).

## Who sees which spot (SPOT)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| SPOT-01 | u | Distance between points: same point, 1 m apart, symmetric, across the date line, near a pole; random pairs against a reference formula | Within a metre or two of the reference, symmetric, never negative | R-03, R-09 |
| SPOT-02 | i | `GET /spots?bbox=` for a city station, with no position sent, from any member | Returned | R-03 |
| SPOT-03 | i | A green, active custom spot; the phone at 149 m, 151 m and far away, with accuracy 50 m | Returned at 149 m; hidden at 151 m and far | R-03, D-47 |
| SPOT-04 | i | The same spot at 100 m with accuracy 50, 51 and none, and with no position | Returned only with accuracy 50 or better | R-03, D-25 |
| SPOT-05 | i | A custom spot that is active and red, orange or grey, a member far away with no position | Returned; green on both types, or inactive: hidden | R-03, D-47 |
| SPOT-06 | u | Colour table: full bowl at 17:59:59, 18:00, 23:59:59, 24:00; partial at 8:59:59, 9:00, 11:59:59, 12:00; water; no log of one type but data of the other; no data; `*_empty_at` after the last log; an unverified and a cancelled log | Green, orange, red, grey as D-14 and D-17 say; the worse of food and water; the same golden table runs in the client (MAP-02) | D-14, D-17 |
| SPOT-07 | i | A pending custom spot: the creator, an admin, another member 10 m away | Creator and admin see it; the other does not | R-27 |
| SPOT-08 | i | `GET /spots/{id}` for a hidden spot and for an id that never existed | Same status, same body, byte for byte | R-03 |
| SPOT-09 | i | Look for a hidden custom spot through search, the feed's place tag, chat, comments, reports and share links | Nowhere; in the feed a cat at a custom spot shows only a coarse area (D-92) | R-03, R-28 |
| SPOT-10 | i | A box over the cell limit; an inverted box; `NaN`; one on the date line | The refusal D-92 settles; `INVALID_INPUT`; never a `500` | R-03 |
| SPOT-11 | i | Random spots and boxes (property test), spots exactly on a cell edge | The answer equals a brute-force filter: none missing, none twice | R-03 |
| SPOT-12 | i | `GET /spots` as the creator and as another member | The caller's own pending spots are included, nobody else's | R-27 |
| SPOT-13 | i | `POST /spots` from an address; from "my location" with accuracy 50, 51 and none | Saved `pending`; 51 and none `LOCATION_REQUIRED`; address from the cached reverse lookup; a missing name made from the street | D-43, R-27 |
| SPOT-14 | i | An address the geocoder does not know; the geocoder down | `ADDRESS_NOT_FOUND`; never a spot at 0,0 | D-43 |
| SPOT-15 | i | Six spots in one UTC day; six at once | The sixth `DAILY_LIMIT`; exactly five of six at once | R-12 |
| SPOT-16 | i | A spot name the check rejects; the breaker tripped | `MODERATION_REJECTED`, nothing saved; saved `pending` and hidden, the answer is not a refusal | R-04, R-05 |
| SPOT-17 | i | A city station: rename, deactivate, delete, as a member and as an admin | `FORBIDDEN`, nothing changed | R-20 |
| SPOT-18 | i | The creator renames, asks `active: false`; an admin approves the request, rejects another | Rename moderated; the spot stays active with `inactive_requested`; approve makes it inactive; reject clears the flag | R-32 |
| SPOT-19 | i | A member who is not creator or admin `PATCH`es a spot | `FORBIDDEN`; an unknown spot `NOT_FOUND` | R-32 |
| SPOT-20 | i | `GET /search?q=` for names, in Hebrew, Arabic, Russian; with a stray `places=1`; no match; a 1,000 character query; regex characters | Only spots R-03 allows, kittens seen first; spots only, since places are searched on the phone (D-88); no match `[]`; never a `500` | R-03, R-35 |
| SPOT-21 | i | `POST /spots/{id}/logs` at a hidden, pending, rejected and missing spot | Refused, nothing saved; hidden and missing give the same answer (the code for pending is D-92) | R-27, R-03 |

## Logs, empty reports, kittens (LOG)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| LOG-01 | i | A feeding at 49 m, 50 m (open: D-92) and 51 m, accuracy 10 | Counted at 49; unverified at 51; the answer says only counted or unverified | R-09, D-18 |
| LOG-02 | i | A log with accuracy 50, 51, zero and none; with no location at all | Counted at 50; the rest saved unverified | D-25, R-09 |
| LOG-03 | i | Counted full, counted partial, counted water, unverified | Timers and `last_fed_amount` set; stats rise; the unverified one changes no timer or stat and is not listed | R-09, D-16 |
| LOG-04 | i | A second counted feeding by the same member at the same spot after 2:59:59 and 3:00:00; a water log at once; another spot; another member | `TOO_SOON`, then allowed; the water log, other spot and other member are allowed | R-10 |
| LOG-05 | i | An unverified log, then a counted one at once | The counted one is allowed: unverified does not count for R-10 | R-10, R-09 |
| LOG-06 | i | 30 counted logs in 24 hours across spots and kinds, then a 31st; wait for the oldest to leave the window | `LOG_LIMIT`; one place frees up; cancelled and unverified logs never counted | R-13 |
| LOG-07 | i | 60 attempts in a UTC day of counted, unverified, refused logs, empty and kittens reports; then the 61st | `ATTEMPT_LIMIT`; reset at 00:00 UTC | R-17 |
| LOG-08 | i | Ten identical log requests at the same moment (a double tap, two phones) | Exactly one counted, the rest `TOO_SOON`; log, timers and counters agree (one step, D-92) | R-10, R-17 |
| LOG-09 | i | Thirty-one logs at 31 spots at once by one member | Exactly 30 counted (one step, D-92) | R-13 |
| LOG-10 | i | Every refusal (`TOO_SOON`, `LOG_LIMIT`, `ATTEMPT_LIMIT`, `BANNED`, `RATE_LIMITED`) | No `care_logs` row, spot unchanged | D-23 |
| LOG-11 | i | `kind` and `amount` combinations: water with an amount, a feeding with none, a bad `kind` | `INVALID_INPUT` | D-16 |
| LOG-12 | i | Cancel a counted log at 9:59 and at 10:00 and later; then re-log at once | Allowed, then `TOO_LATE`; the log is `removed`; the spot's timers return to the latest log that counts; R-10, R-13 and the stats follow; re-logging is allowed | R-37 |
| LOG-13 | i | Cancel someone else's log; a missing log; the same log twice | `NOT_FOUND` for the first two, identical; the second cancel changes no stat | R-37 |
| LOG-14 | i | A cancelled log and the attempt counter | It still counts toward R-17 | R-37, R-17 |
| LOG-15 | i | A valid "food is empty" and "water is empty" report: the reporter at 49 m, accuracy 50, a log by someone else | Saved as `food_empty` or `water_empty`; the type is red until the next counted log; the latest counted log of that type is disputed; the logger's stats are untouched | R-16, D-19 |
| LOG-16 | i | Every way an empty report fails: far, vague, no location, repeat, the reporter's own log, a pending or hidden spot | The same status and body byte for byte, nothing saved; each counts toward R-17 | R-16, R-17 |
| LOG-17 | i | Kittens within the radius; again while it shows; at 13 d 23 h 59 min 59 s and at 14 d | Saved and shown; the second refused like an empty report; gone at 14 d (open: D-92); no timer changes | R-35 |
| LOG-18 | i | Kittens from 51 m, and with accuracy 51; then read `GET /spots`, `GET /spots/{id}` and search at 14 d minus 1 s and at 14 d | `REFUSED`, identical to LOG-16; "kittens seen" is worked out when the server answers (no job) and such spots come first; R-03 and the pin colour are unchanged | R-35, D-67 |
| LOG-19 | i | The 3 hour window across 00:00 UTC and across an Israeli daylight saving change | It is three real hours, not a calendar rule | R-06, R-10 |
| LOG-20 | i | Make the database throttle in the middle of a log | Clean refusal; never a log without its timers | R-09 |

## Cat alerts (ALR)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| ALR-01 | i | Raise with no photo, no note, no location, accuracy 50 and 51 | Missing parts `INVALID_INPUT`; location `LOCATION_REQUIRED`; nothing saved | R-23 |
| ALR-02 | i | Kinds `danger`, `sick`, `neuter`; any other; a note at its minimum and maximum length constants and one either side | Three accepted; the rest `INVALID_INPUT` | D-64, D-42 |
| ALR-03 | i | Six alerts in a UTC day across all three kinds; six at once | The sixth `DAILY_LIMIT`; five of six at once | R-23 |
| ALR-04 | i | A photo the check answers NOT_CAT, UNSAFE, nonsense, nothing; the breaker tripped | `NO_CAT_IN_PHOTO`, `MODERATION_REJECTED`; hidden; saved `pending` and hidden | R-25, R-04, R-05 |
| ALR-05 | i | A pending, rejected and removed alert, listed by another member | Never shown; the creator's own is D-92 | R-24, R-04 |
| ALR-06 | i | A `danger` alert at 5:59:59, 6:00:00 after `created_at`; a `neuter` at 6 h and 7 d | On the map until its expiry, then in the past list; a delayed check is D-92 | R-24, D-64 |
| ALR-07 | i | Extend by an admin: an alert with 1 h left; one expired 3 h ago; again; a `neuter`; one in the past list; one expired more than 7 days ago | Old expiry plus 12 h; now plus 12 h; sums add; 7 days for `neuter`; back on the map; refused after 7 days | R-24 |
| ALR-08 | i | `GET /cat-alerts?past=1` at expiry plus 7 d minus 1 s, and plus 7 d; a resolved alert | Listed, then gone; resolved never listed; every member sees the list | R-24, D-58 |
| ALR-09 | i | Resolve as the creator, an admin, another member, twice | Works; works; `FORBIDDEN`; `ALREADY_RESOLVED`; gone from both lists at once; `GET /cat-alerts/{id}` is `NOT_FOUND` | R-24, D-84 |
| ALR-10 | i | `GET /cat-alerts/{id}` for a live, a past (inside 7 days), an older and a pending alert | Live and past returned; older and pending `NOT_FOUND` | D-83 |
| ALR-11 | i | Alerts from members at 5 m and 400 km, with no position sent | Every member sees the exact point; the box filter returns each once | D-47 |
| ALR-12 | i | A banned member raises or resolves | `BANNED` | R-08 |

## Municipal import (IMP)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| IMP-01 | i | Run the import twice on the same data | The same rows, no duplicates, no writes the second time | D-34 |
| IMP-02 | i | A station vanishes from its source; reappears | `removed` (no delete), then back | R-07, D-34 |
| IMP-03 | i | Bad rows: no coordinates, a point at sea or far outside the country, a duplicate id, a huge file | The bad row is skipped and reported; the rest load | D-34 |
| IMP-04 | i | The source answers empty, errors or times out | No station is removed | D-34 |
| IMP-05 | i | The import runs while custom spots exist | Custom spots are never touched; members still cannot change a station | R-20 |
| IMP-06 | i | Address-only list through the geocoder | At most 4 requests a minute, results cached, a failed address left out | D-34 |
| IMP-07 | u | A station id from any source | Starts with the source id, never contains a dot | D-63 |
