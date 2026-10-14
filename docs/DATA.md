# Data

DynamoDB, one table per entity to start (simple to read; revisit only if a query needs it). All
fields `snake_case`. All times UTC ISO 8601. Every item has `status` and `created_at`.

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `user_id`, `display_name`, `city`, `avatar_url`, `show_google_photo` (bool), `status` (`active`/`banned`), `chat_restricted_until`, `is_admin`, counters (`cats_helped`, `feedings`, `waters`) | `user_id` is the Cognito subject. `display_name` is the full name typed at first sign-in (D-27). `avatar_url` is the Google account photo, written only by the server at sign-in and shown only when `show_google_photo` is true (D-21) |
| `spots` | `spot_id`, `name`, `photo_key`, `address`, `lat`, `lng`, `geohash`, `approx_lat`, `approx_lng`, `active`, `last_fed_at`, `last_fed_amount`, `last_watered_at`, `food_empty_at`, `water_empty_at`, `created_by` | `approx_*` is computed once at creation. `lat`, `lng`, `address` never leave the server except via R-03. `*_empty_at` is the latest "was empty" report (D-19) |
| `logs` | `log_id`, `spot_id`, `user_id`, `kind` (`feeding`/`water`), `amount` (`full`/`partial`, feeding only), `counted` (bool), `disputed_by` (member ids), `distance_m`, `status` | `counted` is the result of the R-09 checks. `disputed_by` is filled by "was empty" reports (R-16, D-19); not empty means disputed. `distance_m` is rounded to 10 m; the phone's coordinates are not stored |
| `cats` | `cat_id`, `spot_id`, `name`, `photo_key`, `created_by`, `like_count`, `status` | One photo per sighting |
| `comments` | `comment_id`, `cat_id`, `user_id`, `text`, `status` | |
| `messages` | `message_id`, `scope` (`spot`/`cat`), `scope_id`, `user_id`, `text`, `status` | |
| `alerts` | `alert_id`, `spot_id`, `kind` (`danger`/`sick`), `photo_key`, `note`, `status` (`open`/`resolved`), `created_by` | |
| `places` | `place_id`, `kind` (`vet`/`organisation`), `name`, `address`, `lat`, `lng`, `phone`, `status` | Public data, exact coordinates are fine |
| `reports` | `report_id`, `target_type`, `target_id`, `reporter_id`, `status` | Admin queue |
| `daily_counters` | `key` (e.g. `moderation#2026-10-13`), `count` | Backs R-05, R-03 and R-17 |

`status` values for moderated content: `pending`, `approved`, `rejected`, `removed`.

## Queries

- Map view: spots by geohash prefix for the viewport, returning only approximate fields. Served
  through CloudFront with a short cache.
- Needs-food/water layer: computed in the client from `last_fed_at`, `last_fed_amount`,
  `last_watered_at`, `food_empty_at`, `water_empty_at`, `active` and the thresholds in
  `src/constants/`. No server job.
- Spot page: logs, cats, messages by `spot_id`, newest first.
- Logs by member: by `user_id`, newest first. Gives the 24 hour count (R-13).
