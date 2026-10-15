# Sources: municipal feeding stations

Seed data for the map: the feeding stations municipalities have already installed. Not user
content, so moderation (R-04) does not apply, but nothing is trusted blindly. Decisions: D-34, D-35.

## What exists (checked 2026-10-14)

No national dataset exists. Full coverage of Israel cannot come from public data alone today.

| Source | Finding |
|---|---|
| data.gov.il (CKAN API) | Zero datasets for חתולים, האכלה, חתולי רחוב, cats. Nearest: "עמותות וארגונים למען בעלי חיים" (Ministry of Environmental Protection, XLS), useful for `places`, not stations |
| Tel Aviv ArcGIS, `gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/800` | "בתי האכלה לחתולי רחוב": 25 points. Public, supports `f=geojson` and `outSR=4326` (source is ITM, EPSG:2039), max 2000 per request. Fields: `oid`, `address`, `date_import` and unused code fields. Empty copyright text |
| Jerusalem vet-service page | A list by neighbourhood and address. The site answered 403 to an automated fetch. No coordinates |
| Ramat HaSharon | An HTML list of 5 addresses, no coordinates |
| Rishon LeZion, Rehovot, Givatayim, Haifa | Press only (reported: Rehovot about 49, Givatayim 33, Haifa pilot of 20 in 2020). No published list found |
| OpenStreetMap | No agreed tag (a forum thread suggests `amenity=feeding_place`). The Overpass query timed out twice, so coverage is unmeasured |
| GovMap | No cat layer found |

## Approach: three tiers, one pipeline

1. **API sources** (ArcGIS REST), automatic. Query `where=1=1&outSR=4326&f=geojson`, page with
   `resultOffset` while `exceededTransferLimit` is true. A new ArcGIS city is one registry entry.
2. **Published lists** (HTML or PDF). Fetch the page, extract addresses, geocode once (below), cache
   the result by address, mark `precision: geocoded`. A human reviews every point in the diff. Where a city blocks bots
   or has no list, ask for the data instead (a Freedom of Information request to the vet department).
3. **Manual and members.** `data/municipal/manual.csv` by pull request, and members add the rest
   as custom spots in the app from Phase 3 (D-43).

Sources live in a registry (`pipelines/municipal/sources.json`): `id`, municipality (he, en), `kind`
(`arcgis`, `html_list`, `manual_csv`), `url`, field mapping, permission and `last_checked`. Cities
with no usable source are recorded as `none`, so nobody checks them twice.

## Pipeline

A GitHub Actions workflow, scheduled and manually triggerable (limits in `src/constants/`):

1. Fetch each source, normalise to the schema below.
2. Validate: inside Israel's bounds, required fields present, and a source's count has not dropped
   by more than the allowed share against the previous run (an outage must not empty the map).
3. Diff against `data/municipal/municipal-spots.geojson`. No change, no pull request.
4. Open a pull request with the new file. Merging runs the deploy job, which loads the file into
   the `spots` table (upsert by `source` and `source_id`; a station missing from the file becomes
   `removed`).

Why a pull request and not a Lambda: the diff is reviewed before it goes live, a revert is the
rollback, nothing runs in AWS between releases (the deploy job's role may only write municipal rows),
and no metered call exists to cap (R-05). Risk: GitHub
pauses scheduled workflows in a repo with no activity for 60 days.

## Output: a GeoJSON file in git, rows in `spots`

`data/municipal/municipal-spots.geojson`, RFC 7946 (WGS84), all of Israel. It is the reviewed artifact,
not a public file. Sign-in is required (D-39), so stations reach members through
the member-only API, at their exact point and address (D-47). A public copy on the CDN was
rejected: cheap and cached, but it would hand exact points to people who are not signed in. Names and addresses
are shown as the city publishes them (Hebrew, no machine translation in v1).

Per feature, `snake_case`: `id`, `name`, `address`, `city`, `source`, `precision`
(`source_point`, `geocoded`, `manual`), `status` (`active`, `removed`). Top level: a `sources` map
with `url`, `permission` and `fetched_at` (UTC) per source, so attribution is one lookup.

## Stable ids

Members will log against these, so ids must survive a refresh. Tel Aviv's `oid` is a plain
sequence next to a `date_import` stamp, so it is probably renumbered on each import. Id =
`source` + hash of the coordinates rounded to 5 decimals. A point that moves less than the match
distance (constant) between runs keeps its old id. A station that disappears becomes `removed`,
never deleted.

## Geocoding

A geocoder turns an address into coordinates. Only Tier 2 needs one: Tel Aviv already publishes
coordinates, and a list of a handful of addresses can simply be placed by hand (`precision: manual`).

Nominatim (the OSM server, already the city lookup in D-29) was tested on the 25 Tel Aviv stations,
against the city's own coordinates (checked 2026-10-14): 20 answered, 19 of them within 150 m, median
error 23 m, worst 350 m. 5 found nothing (gardens, a car park, an odd spelling): those get a pin by
hand. Rules for the import job:

- One thread, an identifying User-Agent, at most 4 requests a minute for a recurring script (a one-off
  small batch may go at 1 a second), and every result cached in git so no address is asked twice.
- Reject a result that falls outside its city (a wrong answer would be confident, not empty).
- Data is ODbL: credit OpenStreetMap next to the other sources.
- 50 m is the proof radius for a log (D-18) and a geocoded point can be 100 m or more off, so a
  person checks it on the map before the station becomes loggable (D-35).

Not chosen: Google (its terms limit storing results), Amazon Location (metered, so it would need the
R-05 cap, and storing results costs more), GovMap (could not reach it from here).

## Permission

No licence text was found for any source. Treat each as unlicensed until a municipality confirms in
writing. Before launch (Phase 6 checklist): write to each source's vet department, record the answer
in `permission`, and show "Data: <municipality>" on the map. If a municipality asks, remove it.

## Order of work

1. Tel Aviv: source known, build the adapter.
2. Probe the GIS host of each big city for an ArcGIS `/rest/services` layer (Jerusalem, Haifa,
   Rishon LeZion, Petah Tikva, Beer Sheva, Netanya, Ramat Gan, Givatayim, Herzliya, Rehovot, Bat Yam)
   and record every result in the registry.
3. Lists: Ramat HaSharon, then Jerusalem once access is sorted out.
4. Freedom of Information requests for the rest. Retry OSM when Overpass answers. OSM data is ODbL
   share-alike, so decide before merging it.
