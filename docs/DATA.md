# Data

DynamoDB, one table per entity to start (simple to read; revisit only if a query needs it). All
fields `snake_case`. All times UTC ISO 8601. Every item except `daily_counters` and `geocode_cache` has `status` and `created_at`.

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `user_id`, `display_name`, `city`, `city_lat`, `city_lng`, `avatar_url`, `show_google_photo` (bool), `status` (`active`/`banned`), `chat_restricted_until`, `is_admin`, counters (`cats_helped`, `feedings`, `waters`) | `user_id` is the Cognito subject. `display_name` is the full name typed at first sign-in (D-27). `city_lat` and `city_lng` are the city's map centre from the lookup (D-29). `avatar_url` is the Google account photo, written only by the server at sign-in and shown only when `show_google_photo` is true (D-21) |
| `spots` | `spot_id`, `name`, `photo_key`, `address`, `lat`, `lng`, `geohash`, `active`, `last_fed_at`, `last_fed_amount`, `last_watered_at`, `food_empty_at`, `water_empty_at`, `created_by`, `source`, `source_id`, `status` | `status` is `pending` for a custom spot until moderation passes and an admin approves it, then `approved` (R-27); imports are `approved`. Every position is exact (D-47). A custom spot is returned only as R-03 allows: the member's phone within 150 m, the spot needing food or water, or the member is its creator or an admin. `*_empty_at` is the latest "was empty" report (D-19). `source` is `user` or a municipal source id; `created_by` is the custom spot creator; imports have none. Municipal rows are loaded by the import from Phase 3 (D-34) |
| `logs` | `log_id`, `spot_id`, `user_id`, `kind` (`feeding`/`water`/`food_empty`/`water_empty`), `amount` (`full`/`partial`, feeding only), `counted` (bool, feeding and water only), `disputed_by` (member ids), `distance_m`, `status` | `counted` is the result of the R-09 checks. A "was empty" report that passes R-16 is saved as a `food_empty` or `water_empty` row, so the once per 3 hours check can find it; a refused one is not saved (D-23). `disputed_by` is filled by those reports (R-16, D-19); not empty means disputed. `distance_m` is rounded to 10 m; the phone's coordinates are not stored |
| `cats` | `cat_id`, `spot_id`, `name`, `photo_key`, `geohash`, `area`, `created_by`, `like_count`, `status` | One post per photo; the photo must contain a cat (R-25). `name` is optional and moderated. `spot_id` is set for a cat at a spot and empty for a random cat. `geohash` is the neighbourhood cell (its length is a constant): the spot's cell, or the cell of the phone's location, else of the profile city. It is the only position kept; an exact point is never stored (R-28). `area` is the place tag shown in the feed: the spot's name, or a coarse place name from a cached reverse lookup (D-29). `like_count` is kept by Lambda from `likes` |
| `likes` | `cat_id`, `user_id`, `status` (`active`/`removed`) | One row per member per cat (R-26); liking again flips `status`, no row is deleted |
| `comments` | `comment_id`, `cat_id`, `user_id`, `text`, `status` | |
| `messages` | `message_id`, `scope` (`spot`/`cat`), `scope_id`, `user_id`, `text`, `status` | |
| `cat_alerts` | `cat_alert_id`, `kind` (`danger`/`sick`), `lat`, `lng`, `geohash`, `photo_key`, `note`, `status`, `expires_at`, `resolved_at`, `created_by` | `photo_key` (must contain a cat, R-25) and `note` are required. The pin is the phone's location at submit, shown exactly to members (D-47). `status` is the moderation status (below), nothing is shown until `approved`. `expires_at` is `created_at` + 6 h, +12 h per extension; `resolved_at` is set by an admin. Shown only per R-24 |
| `reports` | `report_id`, `target_type`, `target_id`, `reporter_id`, `status` | Admin queue |
| `daily_counters` | `key`, `count`, `expires_at` | One row per limit per UTC day: `moderation#2026-10-13` for the shared cap (R-05), `<limit>#<user_id>#2026-10-13` for a member's limits: new spots (R-12), log and empty-report attempts (R-17), cat alerts (R-23), cat photos and comments (R-25), uploads (R-30) and the write budget (R-21). The request adds 1 only if the count is under the limit, in the same write, so two requests at once cannot both pass. Limits over a rolling window (R-10, R-13, R-16) are counted from `logs` instead. `expires_at` lets DynamoDB remove old rows on its own. No `status` or `created_at` |
| `geocode_cache` | `query`, `lat`, `lng`, `place` | Saved Nominatim answers, so no question is sent twice (D-29): the profile city, a typed spot address, and the place name for a "my location" pin or a cat post's `area`. `query` is the typed text, normalised, or a point rounded to a constant number of decimals. No `status` or `created_at` |

`status` values for moderated content: `pending`, `approved`, `rejected`, `removed`.

## Queries

- Map view: spots by geohash prefix for the viewport, exact positions; custom spots filtered by
  R-03 with the phone position the app sends, which is not stored. Served
  by the API to signed-in members, so CloudFront cannot cache it for everyone (D-39).
- Needs-food/water layer: computed in the client from `last_fed_at`, `last_fed_amount`,
  `last_watered_at`, `food_empty_at`, `water_empty_at`, `active` and the thresholds in
  `src/constants/`. The server computes the same colours at request time for R-03. No server job.
- Feed: approved cats by geohash prefix around the member's cell, from the last 7 days, minus the photo ids the app sends as already seen, sorted by `like_count` then newest, 20 a page; when nothing unseen is left, the seen ones again (D-45, R-29). Never part of the map answers.
- Cat alerts: by geohash prefix for the viewport, filtered by R-24, exact point (D-47).
- Spot page: logs, cats, messages by `spot_id`, newest first. Cat page: comments by `cat_id`.
- Logs by member: by `user_id`, newest first. Gives the 24 hour count (R-13) and the 3 hour
  checks for logs (R-10) and "was empty" reports (R-16).
