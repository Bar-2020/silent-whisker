# Data

DynamoDB, one table per entity to start (simple to read; revisit only if a query needs it). All
fields `snake_case`. All times UTC ISO 8601. Every item has `status` and `created_at`.

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `user_id`, `display_name`, `city`, `avatar_key`, `status` (`active`/`banned`), `chat_restricted_until`, `is_admin`, counters (`cats_helped`, `feedings`, `waters`) | `user_id` is the Cognito subject |
| `spots` | `spot_id`, `name`, `photo_key`, `address`, `lat`, `lng`, `geohash`, `approx_lat`, `approx_lng`, `active`, `last_fed_at`, `last_watered_at`, `created_by`, `source`, `source_id` | `approx_*` is computed once at creation. `lat`, `lng`, `address` never leave the server except via R-03. `source` is `user` or a municipal source id; imports have no `created_by`. Municipal rows enter this table in Phase 4 (D-23) |
| `logs` | `log_id`, `spot_id`, `user_id`, `kind` (`feeding`/`water`), `photo_key`, `counted` (bool), `photo_hash`, `status` | `counted` is the result of the R-09 checks |
| `cats` | `cat_id`, `spot_id`, `name`, `photo_key`, `created_by`, `like_count`, `status` | One photo per sighting |
| `comments` | `comment_id`, `cat_id`, `user_id`, `text`, `status` | |
| `messages` | `message_id`, `scope` (`spot`/`cat`), `scope_id`, `user_id`, `text`, `status` | |
| `alerts` | `alert_id`, `spot_id`, `kind` (`danger`/`sick`), `photo_key`, `note`, `status` (`open`/`resolved`), `created_by` | |
| `places` | `place_id`, `kind` (`vet`/`organisation`), `name`, `address`, `lat`, `lng`, `phone`, `status` | Public data, exact coordinates are fine |
| `reports` | `report_id`, `target_type`, `target_id`, `reporter_id`, `status` | Admin queue |
| `daily_counters` | `key` (e.g. `moderation#2026-10-13`), `count` | Backs R-05 and R-03 |

`status` values for moderated content: `pending`, `approved`, `rejected`, `removed`.

## Queries

- Map view: spots by geohash prefix for the viewport, returning only approximate fields. Served
  through CloudFront with a short cache.
- Needs-food/water layer: computed in the client from `last_fed_at`, `last_watered_at`, `active`
  and the thresholds in `src/constants/`. No server job.
- Spot page: logs, cats, messages by `spot_id`, newest first.

## Static files (CDN, no table)

Translations (`/locales/{lang}.json`) and municipal stations (`/data/municipal-spots.geojson`,
schema in [SOURCES.md](SOURCES.md)). Both are built in git and deployed to S3, never written by a
Lambda.
