# Data

DynamoDB, one table per entity to start (simple to read; revisit only if a query needs it). All
fields `snake_case`. All times UTC ISO 8601. Every item has `status` and `created_at`.

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `user_id`, `display_name`, `city`, `city_lat`, `city_lng`, `avatar_url`, `show_google_photo` (bool), `status` (`active`/`banned`), `chat_restricted_until`, `is_admin`, counters (`cats_helped`, `feedings`, `waters`) | `user_id` is the Cognito subject. `display_name` is the full name typed at first sign-in (D-27). `city_lat` and `city_lng` are the city's map centre from the lookup (D-29). `avatar_url` is the Google account photo, written only by the server at sign-in and shown only when `show_google_photo` is true (D-21) |
| `spots` | `spot_id`, `name`, `photo_key`, `address`, `lat`, `lng`, `geohash`, `approx_lat`, `approx_lng`, `active`, `has_food`, `has_water`, `last_fed_at`, `last_fed_amount`, `last_watered_at`, `food_empty_at`, `water_empty_at`, `created_by`, `source`, `source_id`, `status` | `status` is `pending` for a custom spot until moderation passes and an admin approves it, then `approved` (R-27); imports are `approved`. `has_food` and `has_water` say what the spot offers (D-43); a type it does not offer is never evaluated, and municipal imports set both. `approx_*` is computed once at creation. `lat`, `lng`, `address` never leave the server except via R-03. `*_empty_at` is the latest "was empty" report (D-19). `source` is `user` or a municipal source id; imports have no `created_by`. Municipal rows are loaded by the import from Phase 3 (D-34) |
| `logs` | `log_id`, `spot_id`, `user_id`, `kind` (`feeding`/`water`), `amount` (`full`/`partial`, feeding only), `counted` (bool), `disputed_by` (member ids), `distance_m`, `status` | `counted` is the result of the R-09 checks. `disputed_by` is filled by "was empty" reports (R-16, D-19); not empty means disputed. `distance_m` is rounded to 10 m; the phone's coordinates are not stored |
| `cats` | `cat_id`, `spot_id`, `name`, `photo_key`, `lat`, `lng`, `geohash`, `area`, `created_by`, `like_count`, `status` | One post per photo; the photo must contain a cat (R-25). `name` is optional and moderated. `spot_id` is set for a cat at a spot (position copied from the spot) and empty for a random cat (position is the phone's location, else the profile city's centre). `lat`, `lng` never leave the server (R-28). `area` is the place tag shown in the feed: the spot's name, or a coarse place name from a cached reverse lookup (D-29). `like_count` is kept by Lambda from `likes` |
| `likes` | `cat_id`, `user_id`, `status` (`active`/`removed`) | One row per member per cat (R-26); liking again flips `status`, no row is deleted |
| `feed_seen` | `user_id`, `cat_ids` (set), `updated_at` | Cat photos already served to the member in the last 7 days (R-29). One row per member, one write per page; ids older than the window are dropped on each write, and the set has a size cap (a constant) |
| `comments` | `comment_id`, `cat_id`, `user_id`, `text`, `status` | |
| `messages` | `message_id`, `scope` (`spot`/`cat`), `scope_id`, `user_id`, `text`, `status` | |
| `cat_alerts` | `cat_alert_id`, `kind` (`danger`/`sick`), `lat`, `lng`, `geohash`, `approx_lat`, `approx_lng`, `photo_key`, `note`, `status`, `expires_at`, `resolved_at`, `created_by` | `photo_key` (must contain a cat, R-25) and `note` are required. The pin is the phone's location at submit. `lat`, `lng` never leave the server except via R-03; `approx_*` is computed once, as for spots. `status` is the moderation status (below), nothing is shown until `approved`. `expires_at` is `created_at` + 6 h, +12 h per extension; `resolved_at` is set by an admin. Shown only per R-24 |
| `reports` | `report_id`, `target_type`, `target_id`, `reporter_id`, `status` | Admin queue |
| `daily_counters` | `key` (e.g. `moderation#2026-10-13`), `count` | Backs R-05, R-03, R-17 and R-21 |

`status` values for moderated content: `pending`, `approved`, `rejected`, `removed`.

## Queries

- Map view: spots by geohash prefix for the viewport, returning only approximate fields. Served
  by the API to signed-in members, so CloudFront cannot cache it for everyone (D-39).
- Needs-food/water layer: computed in the client from `last_fed_at`, `last_fed_amount`,
  `last_watered_at`, `food_empty_at`, `water_empty_at`, `active` and the thresholds in
  `src/constants/`. No server job.
- Feed: approved cats by geohash prefix around the member, from the last 7 days, minus the member's `feed_seen`, sorted by `like_count` then newest, 20 a page; when nothing unseen is left, the seen ones again (D-45, R-29). Never part of the map answers.
- Cat alerts: by geohash prefix for the viewport, filtered by R-24, approximate fields only.
- Spot page: logs, cats, messages by `spot_id`, newest first. Cat page: comments by `cat_id`.
- Logs by member: by `user_id`, newest first. Gives the 24 hour count (R-13).
