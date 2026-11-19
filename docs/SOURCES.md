# Sources: municipal feeding stations

Seed data for the map: the feeding stations municipalities have already installed. Not user
content, so moderation (R-04) does not apply, but nothing is trusted blindly. Decisions: D-34, D-35, D-51, D-132, D-139, D-140, D-141.

## What exists (checked 2026-10-14, again 2026-11-19)

No national dataset exists (D-141). Full coverage of Israel cannot come from public data alone today.

| Source | Finding |
|---|---|
| data.gov.il (CKAN API) | Zero datasets for חתולים, האכלה, חתולי רחוב, cats (again on 2026-11-19). Nearest: "עמותות וארגונים למען בעלי חיים" (Ministry of Environmental Protection, XLS), useful for `places`, not stations |
| Tel Aviv ArcGIS, `gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/800` | "בתי האכלה לחתולי רחוב": 25 points. Public, supports `f=geojson` and `outSR=4326` (source is ITM, EPSG:2039), max 2000 per request. Fields: `oid`, `address`, `date_import` and unused code fields. Empty copyright text. Answers a Lambda in Stockholm: HTTP 200 in 2.2 s (2026-11-19, D-139) |
| Jerusalem | The vet-service page lists addresses by neighbourhood, no coordinates; it answered 403 to an automated fetch. Its map server has no cat layer (2026-11-19) |
| Ramat HaSharon | An HTML list of 5 addresses, no coordinates |
| Rishon LeZion, Rehovot, Givatayim, Haifa | Press only (reported: Rehovot about 49, Givatayim 33, Haifa pilot of 20 in 2020). No published list found |
| OpenStreetMap | No agreed tag; only 6 points tagged `amenity=feeding_place` in all of Israel (2026-11-19). Not loaded: ODbL is share-alike, so decide first |
| GovMap | No cat layer found |

## Source kinds

The import is driven by a list of sources, one row per municipality, in `backend/municipal-import/sources.json` (a data file): `id`, municipality (he, en), `kind`, the address or the file's name, the field mapping, the coordinate system (`wgs84` or `itm`), `permission` (below) and `last_checked` (the date a person last looked, by hand). A city with no usable source is recorded as `none`, so nobody checks it twice.

| Kind | What it is | How it is read |
|---|---|---|
| `arcgis` | A city's ArcGIS map server layer (Tel Aviv) | `where=1=1&outSR=4326&f=geojson`, paged with `resultOffset` while `exceededTransferLimit` is true |
| `geojson` | A GeoJSON file at a public address | Fetched as it is, in GPS coordinates (WGS84) |
| `csv` | A CSV or Excel file from a city's reply to the letter below, with GPS or Israeli grid (ITM) coordinates | The owner drops the file in a private bucket; grid coordinates become GPS through `proj4`, the package the city list job uses too |
| `address_list` | A list of addresses with no coordinates (a web page, PDF or file) | Each address is looked up once (Geocoding), `point_precision` `geocoded`, shown as "approximate" |

A new city of a known kind is one new row. Members add every other place as a custom spot (D-43).

## Pipeline

One Lambda, started by an EventBridge rule (monthly, D-51, D-140), once during the deploy so the map opens with stations, and by hand with `aws lambda invoke`, never by an HTTP route (the interval is a `.json` file in `shared/constants/`):

1. Skip every source whose permission is `refused`: it is never fetched or loaded (D-132). Fetch the others and normalise to the schema below.
2. Validate: inside Israel's bounds, required fields present, and a source's count has not dropped
   by more than the allowed share against the previous run (an outage must not empty the map). A
   source that fails is skipped and named in the run result, and its stations from the previous
   file are carried into the new one. A hand run can accept a real drop for one source.
3. Upsert into the `spots` table by `spot_id` (the stable id below), updating only name, address,
   lat, lng, `geo_cell` and the import status, so log state is kept. A station in the previous file
   but missing from a source fetched this run, or from a source that turned `refused`, becomes `removed`.
4. Write `municipal-spots.geojson` to a private S3 bucket, last, so the baseline never gets ahead
   of the table. The bucket is versioned, so an earlier file can be restored.

The data is runtime data, so it lives in a bucket, not in git, and GitHub pauses scheduled workflows
in a repo with no activity for 60 days. A municipal `spot_id` starts with its source id, so the role
may write only those keys and that bucket. The import makes a few S3 and DynamoDB writes a month,
so there is nothing to cap (R-05).

## Output: a GeoJSON file in S3, rows in `spots`

`municipal-spots.geojson` in a private bucket, RFC 7946 (WGS84), all of Israel. It is the record of
the last import and the baseline for the count check, not a public file. Sign-in is required (D-39), so
stations reach members through the member-only API, at their exact point and address (D-47). A public
copy on the CDN was rejected: cheap and cached, but it would hand exact points to people who are not
signed in. Names and addresses are shown as the city publishes them (Hebrew, no machine translation in v1).

Per feature, `snake_case`: `id`, `name`, `address`, `city`, `source`, `precision`
(`source_point`, `geocoded`, `manual`), `status` (`active`, `removed`); the import maps them to the `spots` fields (`spot_name`, `data_source`, `point_precision`, D-119). Top level: a `sources` map
with `url`, `permission` and `fetched_at` (UTC) per source, so attribution is one lookup.

## Stable ids

Members will log against these, so ids must survive a refresh. Tel Aviv's `oid` is a plain
sequence next to a `date_import` stamp, so it is probably renumbered on each import. Id =
`source` + hash of the coordinates rounded to 5 decimals. A point that moves less than the match
distance (constant) between runs keeps its old id. It is the `spot_id` of the municipal row, so a
refresh updates by key and needs no index on `source`. A station that disappears becomes
`removed`, never deleted.

## Geocoding

A geocoder turns an address into coordinates. Only the `address_list` kind needs one: the other
kinds carry coordinates, and a list of a handful of addresses can simply be placed by hand (`point_precision` `manual`).

Nominatim (the OSM server, already the city lookup in D-29) was tested on the 25 Tel Aviv stations,
against the city's own coordinates (checked 2026-10-14): 20 answered, 19 of them within 150 m, median
error 23 m, worst 350 m. 5 found nothing (gardens, a car park, an odd spelling): those get a pin by
hand. Rules for the import job:

- One thread, an identifying User-Agent, at most 4 requests a minute for a recurring script (a one-off
  small batch may go at 1 a second), and every result cached in the `geocode_cache` table (D-29) so
  no address is asked twice. A run stops geocoding before the Lambda time limit and the next run
  continues.
- Reject a result that falls outside its city (a wrong answer would be confident, not empty).
- Data is ODbL: credit OpenStreetMap next to the other sources.
- 50 m is the proof radius for a log (D-18) and a geocoded point can be 100 m or more off, so the map
  and the spot page say "approximate". Whether such a station can be logged is a Phase 4 call (D-35).

Not chosen: Google (its terms limit storing results), Amazon Location (metered, so it would need the
R-05 cap, and storing results costs more), GovMap (could not reach it from here).

## Permission

No licence text was found for any source. Each source has a state in its row (D-132): `unknown` (not
asked), `requested` (the letter is sent), `granted` or `refused`. Only `refused` stops a load. Before
launch (Phase 6 checklist): send the letter below to each source's vet department, record the answer,
and show "Data: <municipality>" on the map. If a municipality asks (it can write to the contact address, D-74), set `refused`: its stations are removed.

## The letter to a city

A Freedom of Information request (חוק חופש המידע) that the owner sends to the city's information officer, with a copy to the vet service. Fill the words in [brackets]. It is a draft: the owner reads and adapts it before sending.

לכבוד
הממונה על חופש המידע ברשות המקומית [שם העיר]
העתק: השירות הווטרינרי העירוני

הנדון: בקשת מידע לפי חוק חופש המידע, התשנ"ח–1998: מיקומי עמדות האכלה לחתולי רחוב

1. אני פונה בשם Silent Whisker, אפליקציית אינטרנט חינמית בקוד פתוח (רישיון MIT) שבה מתנדבים ממפים עמדות האכלה לחתולי רחוב. האתר: [כתובת האתר]. דוא"ל: silentwhisker.ai@gmail.com.
2. אבקש לקבל את רשימת עמדות ההאכלה לחתולי רחוב שהעירייה הציבה בתחומה, בקובץ ממוחשב (CSV או Excel). לכל עמדה אבקש מען או תיאור מיקום, והעיקר: קואורדינטות של מיקום העמדה, בפורמט GPS (קו רוחב וקו אורך, WGS84) או ברשת ישראל החדשה (ITM), וכן אם העמדה פעילה.
3. אבקש גם את הסכמת העירייה לשימוש חוזר במידע: לשמור אותו ולהציגו באפליקציה לחבריה, ללא תשלום וללא הגבלת זמן, עם ציון שם העירייה כמקור ("מקור המידע: [שם העיר]"). האפליקציה אינה מסחרית ואינה מפיצה מידע אישי.
4. אם לא ניתן למסור חלק מהמידע, אבקש לקבל את היתר ואת נימוקי הסירוב.
5. אם העירייה מבקשת שהעמדות לא יוצגו, אבקש הודעה בכתב והן יוסרו.

בתודה מראש,
[שם], [טלפון או דוא"ל]

## Order of work

1. Tel Aviv: source known, build the `arcgis` adapter and the shared steps.
2. The `csv` kind with grid coordinates, the `geojson` kind and the `address_list` kind.
3. Probe the GIS host of each big city for an ArcGIS `/rest/services` layer (Haifa, Rishon LeZion,
   Petah Tikva, Beer Sheva, Netanya, Ramat Gan, Givatayim, Herzliya, Rehovot, Bat Yam) and record every result in the list.
4. Send the letter to the rest. Retry OSM when Overpass answers. OSM data is ODbL share-alike, so decide before adding it.
