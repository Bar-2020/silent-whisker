# Data

DynamoDB, one table per entity to start (simple to read; revisit only if a query needs it). Table
names follow D-54. All fields `snake_case`. All times UTC ISO 8601. Every item except `daily_usage_counters` and `geocode_cache` has `status` and `created_at`.

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `user_id`, `display_name`, `city`, `city_lat`, `city_lng`, `avatar_url`, `show_google_photo` (bool), `status` (`active`/`banned`), `chat_restricted_until`, `is_admin`, counters (`cats_helped`, `feedings`, `waters`) | `user_id` is the Cognito subject. A new row (made by the first `GET /profile`, D-59) holds `status` `active`, `show_google_photo` false, `is_admin` false, zero counters and `created_at`, plus `avatar_url` when the token has a Google photo; the name and city come with `PATCH /profile`. `display_name` is the full name typed at first sign-in (D-27). `city_lat` and `city_lng` are the city's map centre from the lookup (D-29). `avatar_url` is the Google account photo, written only by the server at sign-in and shown only when `show_google_photo` is true (D-21) |
| `spots` | `spot_id`, `name`, `photo_key`, `address`, `lat`, `lng`, `geo_cell`, `active`, `inactive_requested`, `chat_paused`, `last_fed_at`, `last_fed_amount`, `last_watered_at`, `food_empty_at`, `water_empty_at`, `created_by`, `source`, `source_id`, `status` | `status` is `pending` for a custom spot until moderation passes and an admin approves it, then `approved` (R-27); imports are `approved`. Every position is exact (D-47). A custom spot is returned only as R-03 allows: the member's phone within 150 m, the spot needing food or water, or the member is its creator or an admin. `inactive_requested` is set when the creator asks to mark the spot inactive and cleared when an admin approves or rejects (R-32); `chat_paused` is set by an admin (R-33). `*_empty_at` is the latest "was empty" report (D-19). `source` is `user` or a municipal source id; `created_by` is the custom spot creator; imports have none. Municipal rows are loaded by the import from Phase 3 (D-34) |
| `care_logs` | `log_id`, `spot_id`, `user_id`, `kind` (`feeding`/`water`/`food_empty`/`water_empty`), `amount` (`full`/`partial`, feeding only), `counted` (bool, feeding and water only), `disputed_by` (member ids), `distance_m`, `status` | `counted` is the result of the R-09 checks. A "was empty" report that passes R-16 is saved as a `food_empty` or `water_empty` row, so the once per 3 hours check can find it; a refused one is not saved (D-23). `disputed_by` is filled by those reports (R-16, D-19); not empty means disputed. `distance_m` is rounded to 10 m; the phone's coordinates are not stored |
| `cat_posts` | `cat_id`, `spot_id`, `name`, `photo_key`, `geohash`, `geo_cell`, `area`, `created_by`, `like_count`, `status` | One post per photo; the photo must contain a cat (R-25). `name` is required, 1 to 40 characters, and moderated (R-34). `spot_id` is set for a cat at a spot and empty for a random cat. `geohash` is the neighbourhood cell (its length is a constant): the spot's cell, or the cell of the phone's location, else of the profile city. It is the only position kept, and `geo_cell` is its first part for the feed; an exact point is never stored (R-28). `area` is the place tag shown in the feed: the spot's name, or a coarse place name from a cached reverse lookup (D-29). `like_count` is kept by Lambda from `cat_post_likes` |
| `cat_post_likes` | `cat_id`, `user_id`, `status` (`active`/`removed`) | One row per member per cat (R-26); liking again flips `status`, no row is deleted |
| `cat_post_comments` | `comment_id`, `cat_id`, `user_id`, `text`, `status` | |
| `spot_chat_messages` | `message_id`, `spot_id`, `user_id`, `text`, `status` | Chat is per spot only; cat posts have `cat_post_comments` (D-48) |
| `cat_alerts` | `cat_alert_id`, `kind` (`danger`/`sick`/`neuter`), `lat`, `lng`, `geo_cell`, `photo_key`, `note`, `status`, `expires_at`, `resolved_at`, `created_by` | `photo_key` (must contain a cat, R-25) and `note` are required. The pin is the phone's location at submit, shown exactly to members (D-47). `status` is the moderation status (below), nothing is shown until `approved`. `expires_at` is `created_at` + 6 h (`neuter`: + 7 days, D-64), + 12 h (`neuter`: + 7 days) per extension; `resolved_at` is set by an admin. Shown only per R-24 |
| `content_reports` | `reporter_id`, `target_type`, `target_id`, `status` (`open`/`closed`) | Admin queue. `target_id` is the reported item's id; ids never repeat across tables (ULIDs) |
| `daily_usage_counters` | `key`, `count`, `expires_at` | One row per limit per UTC day: `breaker#2026-10-13` for the global circuit breaker, counted in millionths of a dollar, and `breaker_alert#2026-10-13` so its email goes once a day (R-05, D-52); `<limit>#<user_id>#2026-10-13` for a member's limits: new spots (R-12), log and empty-report attempts (R-17), cat alerts (R-23), cat photos and comments (R-25), uploads (R-30), chat messages (R-31) and the write budget (R-21). The request adds its amount only if the result stays within the limit, in the same write, so two requests at once cannot both pass. Limits over a rolling window (R-10, R-13, R-16) are counted from `care_logs` instead. `expires_at` (epoch seconds, the form DynamoDB's expiry needs) lets DynamoDB remove old rows on its own. No `status` or `created_at` |
| `geocode_cache` | `query`, `lat`, `lng`, `place` | Saved Nominatim answers, so no question is sent twice (D-29): the profile city, a typed spot address, a municipal list address, and the place name for a "my location" pin or a cat post's `area`. `query` is the typed text, normalised, or a point rounded to a constant number of decimals. No `status` or `created_at` |

`status` values for moderated content: `pending`, `approved`, `rejected`, `removed`.

## Keys

Every id the app makes is a ULID, which starts with the time: sorting by id sorts by time, and two
items never share a sort key. The exception is a municipal station's `spot_id`, which is its stable id
(it starts with its source id, [SOURCES.md](SOURCES.md#stable-ids)), so the import updates by key. Index sort keys may repeat, so they use `created_at`. `geo_cell` is
the geohash cut to a constant length (one for the map, a coarser one for the feed). A map or feed
request queries each cell it covers and filters the rest in Lambda; above a constant number of
cells the app asks the member to zoom in.

| Table | Partition key | Sort key | Indexes (partition, sort) | Serves |
|---|---|---|---|---|
| `users` | `user_id` | | | Profile; ban and chat checks (R-08) |
| `spots` | `spot_id` | | `geo_cell` (map fields only); `status`, `created_at` (keys only) | Map (R-03), spot page, admins' list of pending spots (R-27) |
| `care_logs` | `spot_id` | `log_id` | `user_id`, `created_at` | Spot history and the latest counted log to dispute (D-19); per member, R-10, R-13 and R-16 |
| `cat_posts` | `cat_id` | | `spot_id`, `created_at`; `geo_cell`, `created_at` | Likes and comments by id, cats on the spot page, the feed's last 7 days (D-45) |
| `cat_post_likes` | `cat_id` | `user_id` | | One like per member per cat (R-26) |
| `cat_post_comments` | `cat_id` | `comment_id` | | Cat page, newest first |
| `spot_chat_messages` | `spot_id` | `message_id` | | Chat of a spot, newest first |
| `cat_alerts` | `cat_alert_id` | | `geo_cell`, `expires_at` | Map and list (R-24): `expires_at` after now; the past-alerts list: `expires_at` in the last 7 days |
| `content_reports` | `reporter_id` | `target_id` | `status`, `created_at` (keys only) | One report per member per item, hiding what a member reported from them, the admin queue |
| `daily_usage_counters` | `key` | | | Daily limits; DynamoDB deletes rows after `expires_at` |
| `geocode_cache` | `query` | | | Saved lookups (D-29) |

Capacity (D-26): each table and each index needs at least 1 read and 1 write unit, so these 11
tables and 7 indexes take 18 of the 25 free units, leaving 7 for the busiest (`care_logs`, `spots`,
`daily_usage_counters`); `daily_usage_counters` takes 2 of them (3 write units, `shared/constants/capacity.json`), because every paid call and every member write counts there (D-52). That holds about one counted log a second, plus DynamoDB's short burst
allowance.

## Queries

- Map view: spots by `geo_cell` for the viewport, exact positions; custom spots filtered by
  R-03 with the phone position the app sends, which is not stored. Served
  by the API to signed-in members, so CloudFront cannot cache it for everyone (D-39).
- Needs-food/water layer: computed in the client from `last_fed_at`, `last_fed_amount`,
  `last_watered_at`, `food_empty_at`, `water_empty_at`, `active` and the thresholds in
  `shared/constants/`. The server computes the same colours at request time for R-03. No server job.
- Feed: approved cats by `geo_cell` around the member's cell, from the last 7 days, minus the photo ids the app sends as already seen, sorted by `like_count` then newest, 20 a page; when nothing unseen is left, the seen ones again (D-45, R-29). Never part of the map answers.
- Cat alerts: by `geo_cell` for the viewport, filtered by R-24, exact point (D-47); the past-alerts list is the ones whose `expires_at` fell in the last 7 days and were not resolved (R-24).
- Spot page: `care_logs` (counted ones only, R-09), `cat_posts`, `spot_chat_messages` by `spot_id`, newest first. Cat page: `cat_post_comments` by `cat_id`.
- Logs by member: by `user_id`, newest first. Gives the 24 hour count (R-13) and the 3 hour
  checks for logs (R-10) and "was empty" reports (R-16).
