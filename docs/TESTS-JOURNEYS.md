# Test scenarios: whole journeys, the deployed site, infrastructure

Layers and how to cite: [TESTING.md](TESTING.md). Journeys use several members at once, so they run in the browser
against the local server of D-91 (`e`) or as handler calls (`i`). The paid checks are faked; nothing here writes to the real stack.

## Journeys (JRN)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| JRN-01 | e | A new volunteer: landing, sign-in, sign-up form, install guide, location, map, a spot, a counted log, cancel it | The stats and the spot's colour follow each step and go back after the cancel | R-09, R-37 |
| JRN-02 | e | The same member logs from 300 m away | Saved unverified: the colour, History and stats are unchanged | R-09 |
| JRN-03 | e | Two members at one spot: A logs, B logs, A logs again, B reports "empty" | B counts; A is `TOO_SOON`; the spot turns red; A's log is disputed and A's stats stay | R-10, R-16, D-19 |
| JRN-04 | e | A custom spot: made from "my location", hidden from B next to it, approved by an admin, seen by B at 149 m and not at 200 m, seen from afar once it is red | Each step as R-03 says | R-03, R-27 |
| JRN-05 | e | A creator asks "inactive", an admin approves, the spot goes quiet | The spot stays active until the admin acts | R-32 |
| JRN-06 | e | A raises a danger alert, it waits in review, the check approves, B sees it, B cannot resolve it, time moves 6 hours, an admin extends it, A resolves it | Map, list and past list follow each step; a resolved alert is never shown again | R-23, R-24, D-84 |
| JRN-07 | e | A posts a cat at a spot, B sees it unseen first, likes and comments, A removes it, B reports a comment, an admin hides it | Removed with its likes and comments; hidden for B at once, then for everyone | R-26, R-38, D-81 |
| JRN-08 | e | A and B chat at a spot; an admin restricts B, pauses the chat, resumes, unrestricts | B reads and removes own messages; nobody posts while paused; each notice is plain | R-08, R-33 |
| JRN-09 | e | An admin bans B in the middle of a session; B deletes the account; B signs in again | B reads but cannot write; deleting works; the ban stays and sign-in is refused | R-08, D-71 |
| JRN-10 | e | Raise `terms_version` while a member is on the map | The next call shows the accept step and then returns to the same page | R-36, D-69 |
| JRN-11 | e | Fill the day's breaker, then a member posts a cat photo, chat and a profile save; the next day the job runs | Pending and hidden; "try again later" for the profile; approved items appear; one owner email | R-05, D-53, D-62 |
| JRN-12 | e | JRN-01 and JRN-03 in Hebrew, English, Arabic and Russian | Same outcomes; screenshots stay within the diff budget per language | D-85, R-18 |
| JRN-13 | e | Slow 3G, 2 s latency and 20% failures while logging, posting and liking | No double saves, no lost form input, no stuck spinner, every error has a message | D-57, D-67 |
| JRN-14 | e | One member in two tabs: log in one, refocus the other | The second shows the new state and a consistent Cancel | R-37 |
| JRN-15 | i | A script as one member calls every route 200 times in a minute | `429`s appear, data stays consistent, counters are right, spend stays inside the limits | R-21, D-52 |

## The deployed site (DEP)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| DEP-01 | d | Headers of the site, a locale file and the API | A strict Content-Security-Policy, `X-Content-Type-Options`, a referrer policy, HSTS; `index.html` not cached for long, hashed files cached long | D-59 |
| DEP-02 | d | Without a token: the API, `/locales/he.json`, `/privacy`, `/terms`, `/` | The API a bare `401`; the other four `200` | R-22 |
| DEP-03 | d | A photo's public address without a signature; an expired signed address; the quarantine prefix | Denied; `403`; unreadable by anyone | D-39, R-04 |
| DEP-04 | d | After each deploy: fetch `index.html` and every file it names; the four locale files; `/api/profile` without a token | All `200`; valid JSON with equal keys; `401` | D-02, R-19 |
| DEP-05 | d | A sign-in with the owner's test user (D-91), then `GET /profile`, the map and one spot page | `200` each; nothing is written except the profile row the first `GET` makes | D-91, D-59 |
| DEP-06 | m | Sign in by hand with a real Google account, once before launch, through Google's own consent screens | Works end to end; Google's screens cannot be scripted reliably | D-04 |

## Infrastructure (INFRA)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| INFRA-01 | t | Every Lambda role's policy | Only its tables and actions: the profile reader cannot write another table or delete; no `*` action or resource; the deployer cannot change itself | D-02 |
| INFRA-06 | i | Push the provisioned capacity past its units with writes in a burst | A clean refusal, nothing half saved, the member's limits intact | D-26 |
| INFRA-07 | t | Every CloudFront behavior (the files, `/design`, `/api`) | Each sets a response headers policy, so a behavior added later cannot ship bare, and each gets the one named for its kind: the files `app`, every `/design` behavior `design`, every `/api` behavior `api` (D-104); every such policy sends a Content-Security-Policy, `X-Content-Type-Options`, a referrer policy and HSTS (max age from `shared/constants/security-headers.json`), each overriding the origin's; no Content-Security-Policy allows `unsafe-eval`; the app's and the API's cannot be framed (`frame-ancestors 'none'`), and the app's allows no `unsafe-inline` | D-59, D-104 |
| INFRA-08 | t | The `deploy` job in `.github/workflows/ci.yml` | It installs no dependencies and builds nothing (no `npm` or `vp` step, no Vite+ setup), so no dependency's code runs beside the AWS key; it downloads the build that the `verify` job made and uploaded, and does so before the AWS credentials step; the `verify` job uploads that build | D-02 |
| INFRA-09 | t | The response headers policies in Terraform | The app's policy adds `Cache-Control: no-cache`, overriding the origin, so a browser asks again on every visit and never keeps an old language file next to a new page; the policies of the design mocks and the API add no `Cache-Control` | D-113 |
| INFRA-10 | t | The `deploy` job in `.github/workflows/ci.yml`, its sync of the build (`frontend/dist`) to the site's bucket that removes old files (not the design mocks' sync, which goes to another bucket) | It excludes `cities/*`, so a deploy never deletes the city files that `npm run cities:upload` put in the site's bucket | D-117 |
| INFRA-11 | i | The monthly city list job (`handler` of `backend/update-cities`, which calls `refreshCityList` in `shared/city-list-update.ts`) with a faked government source (`fetch`) and a faked S3: a good answer with no list on the site yet (`NoSuchKey`); a good answer over a list it contains all the codes of; the source answering 500, not JSON, JSON of another shape, taking longer than `CITY_SOURCE_TIMEOUT_MS`; fewer places than `CITY_LIST_MIN_PLACES`; a list lacking a code of the one on the site; an S3 error other than `NoSuchKey` when reading the list on the site; a failed write | A good run writes the four files `cities/he.json`, `en.json`, `ar.json`, `ru.json` (`application/json`, `Cache-Control: no-cache`, rows as in PROF-33) of the `SITE_BUCKET`, with `en.json` last (the server accepts a code only when it is in that file, so a run that fails half way never leaves a place the app shows and the server refuses), and answers the number of places; the first run works; every failure throws, writes no file at all, and the next run still works; a failed write does not leave a half-new list unnoticed (the error is thrown) | D-117 |
| INFRA-12 | t | The city list job in Terraform | A schedule `cron(0 3 1 * ? *)` (from `shared/constants/api.json`) with no flexible window starts the function through its own role, which may only invoke that function; the function's role may read only `cities/en.json`, list the site's bucket and write `cities/*`, nothing else, no wildcard action; its setting SITE_BUCKET is the site's bucket; an alarm on the function's `Errors` metric (one error in a day) publishes to the alert topic, and a day without data is not an alarm | D-117, D-52 |
