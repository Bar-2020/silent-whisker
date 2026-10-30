# Test scenarios: the screens

Layers and how to cite: [TESTING.md](TESTING.md). Browser rows run on Chromium and WebKit at phone and desktop sizes
unless a row says otherwise. The screens are in `design/briefs/`.

## Map (MAP)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| MAP-01 | e | Open the map with location granted, denied, and tiles blocked | Centred on the phone, or on the profile city; grey ground with markers still working; tile requests carry a Referer | D-27, D-10 |
| MAP-02 | c | Render spots from the golden colour table of SPOT-06 | Same colour as the server for every row; grey only with no data; inactive quiet, pending dashed (creator and admin); selected larger | D-14, D-17, D-47 |
| MAP-03 | e | Every marker's accessible name, and cat alert markers | The state in words; alerts have their own silhouette and a word label; no cat photo on the map | D-57, D-45 |
| MAP-04 | e | Tap a marker on a phone and at 1024 px | A sheet, then a 400 px panel, with photo, two chips, last log, a details button; the close X at the inline end; the action buttons hide while it is open | D-58 |
| MAP-05 | e | The "+" menu; the search box; type ten letters; submit | New spot and Report a cat; spot names as you type, from our server; cities, streets and addresses only after submit, asked of the geocoder by the phone itself and never per key (D-88); no match shows an empty state | D-88, D-58 |
| MAP-06 | e | Pan and zoom for 5 seconds; a view over the cell limit; an empty area | A debounced request per settled move (under a constant); a "zoom in" hint; "no spots here yet" | D-39, DATA.md |
| MAP-07 | e | The list view with spots inside and beyond 2 km: red with kittens, red, orange with kittens, orange, no data, green, green with kittens, inactive | A request for the box around the phone; inside 2 km: red with kittens, then red, then the rest (kittens seen, orange, no data), nearest first inside each; green without kittens and inactive spots absent; every row a real button | D-103, D-82, R-35 |
| MAP-08 | e | Location unavailable, or accuracy 120 m | The locate control explains and never nags; the app sends only what the phone reports | D-31 |
| MAP-09 | e | The admin view: pending spots, approve, reject | Dashed pins; each action asks to confirm; the list updates | R-27 |
| MAP-10 | e | Move the phone 200 m; sign out and in as someone else | A custom spot appears and goes on the next fetch; no earlier member's pins appear | D-39, R-03 |
| MAP-11 | e | The credit | Shown in a corner, folds into an (i) after 5 seconds, opens again, never removed | D-58 |
| MAP-12 | e | The list with location on, then pan the map 5 km away; the same with location off or denied | With location on the list does not change; with it off, the box and the distances follow the map's centre | D-103, D-31 |
| MAP-13 | e | The list when every spot inside 2 km is green with no kittens | The words that nothing near needs help right now, not an error or a blank screen | D-103 |

## Spot page and logging (SPOTUI, LOGUI)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| SPOTUI-01 | e | Open a city station, an active, an inactive and a pending custom spot | Name, photo, exact address, tags, two state rows with icon and word, "last counted log", four tabs; a station has no rename; History lists no unverified log | R-20, R-27 |
| SPOTUI-02 | e | Share and Navigate | The share sheet gets the name and link, never the address; Navigate is a plain Google Maps directions link with the spot's point, no key | D-83, D-57 |
| SPOTUI-03 | e | Open a link to a hidden spot and to one that never existed | The same not-found page | R-03 |
| SPOTUI-04 | e | Creator renames and asks "inactive"; an admin does it | The creator sees a pending request and the spot stays active; the admin's change shows at once | R-32 |
| SPOTUI-05 | e | "Report a problem": each of four reasons | A dialog, then a toast; nothing is hidden | D-81 |
| LOGUI-01 | e | Log a feeding: tap confirm twice quickly | One request; a spinner while pending; a toast says the log counts only at the spot and the place is not stored | D-57, D-67 |
| LOGUI-02 | e | Move the browser's position between opening the form and tapping confirm; accuracy 51 m; denied; timeout | The request carries the position read at the tap (fresh, not cached); the unverified message appears when it is not counted; never a distance | R-09, D-25 |
| LOGUI-03 | e | The answers `TOO_SOON`, `LOG_LIMIT`, `ATTEMPT_LIMIT`, `RATE_LIMITED`, `BANNED`, `TERMS_REQUIRED`, offline | Each its own plain message; offline keeps the choices and says the save was not confirmed; nothing queued in storage | D-67, R-10 |
| LOGUI-04 | e | Cancel at 9:59 and after 10:00 (fake clock); a stale tab | Cancel offered for 10 minutes in the notice and in History; a confirmation; a grey "back as it was" notice; `TOO_LATE` handled | R-37, D-79 |
| LOGUI-05 | e | An empty report accepted and one refused | Identical on screen; the button disabled afterwards | R-16 |
| LOGUI-06 | e | Kittens: report, report again; sick cat button | Disabled "already reported" with the tag, also in search; the sick cat button opens the alert form and back returns | R-35, D-67 |
| LOGUI-07 | e | New spot: name 60 and 61 characters; address; "my location" with a vague reading; limit 5; refused text | Plain errors in words; submit shows "waiting for an admin" | D-43, D-58 |
| LOGUI-08 | e | Pick a photo: a 12 MB 4000 x 3000 JPEG, PNG, WebP, HEIC, a 0 byte file, a text file renamed `.jpg`, a 30000 x 30000 image; cancel the picker | Resized to 1600 px and 500 KB; EXIF location gone; plain error for the rest; the tab never freezes | R-11 |
| LOGUI-09 | e | The "what was left" tap on a feeding and on a water log: no answer, each of the three, a failed send while offline | Nothing is pre-selected and the form works with no answer; the request carries the choice; offline keeps it | D-93 |

## Cats and the feed (FEED)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| FEED-01 | e | Scroll the feed to the end; reload; clear storage | 20 at a time, one request per page, no duplicate cards; sends the last 500 ids seen; old ones return after clearing; end and empty states | D-45, R-29 |
| FEED-02 | e | Location off | The member's city shown, with a note | D-58 |
| FEED-03 | e | Like quickly three times; the server answers `5xx` or `BANNED` | Optimistic, ends equal to the server; rolls back on failure; never negative | R-26 |
| FEED-04 | e | Post a cat: no name, 40 and 41 characters, no cat, refused, daily limits, a huge photo | The right message each time; "in review" visible only to the poster; the photo is resized | R-34, R-25 |
| FEED-05 | e | A cat page: comment, a refusal, the limit, chat-restricted, report, remove own | Newest first; a toast; a notice; the box disabled; hidden from me at once; gone for everyone after a confirmation | R-38, D-81 |
| FEED-06 | e | The photo address expires (fake clock); a photo fails to load | A fresh address is fetched; a placeholder; no layout shift | D-39 |
| FEED-07 | e | Look in the DOM, state and responses of the feed | No coordinates | R-28 |

## Cat alerts (ALRTUI)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| ALRTUI-01 | e | The raise form with each of kind, photo, note and location missing in turn | Submit stays disabled until all four hold; the location line says locating, good or too vague, with what to do | R-23 |
| ALRTUI-02 | e | Submit; refused for no cat, for text, for the daily limit of 5 | "In review" with the expiry time (6 hours, or 7 days for spay or neuter); back on the Alerts tab; plain messages | R-23, R-25, D-64 |
| ALRTUI-03 | e | The list: newest first, expiring soon, empty, past alerts, an ended alert | Rows as in the brief; ended ones marked, shown for 7 days to everyone; no countdown | R-24, D-58 |
| ALRTUI-04 | e | The sheet as admin, as the creator, as another member | Admin: resolve and extend; creator: "mark as handled"; others: neither; resolving asks to confirm and removes it from map and list at once | D-84, R-24 |
| ALRTUI-05 | e | Times in Hebrew, Arabic, Russian at 59 min, 60 min, 23 h, 24 h, 6 days; a phone clock two days wrong | Right plural forms; the server's state decides, so a wrong clock changes nothing | R-24, D-85 |
| ALRTUI-06 | e | An alert's own page | Navigate and Show on map on the pinned bar; share works; an old or hidden one is not-found | D-83 |

## Chat (CHAT)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| CHAT-01 | e | Send a message; one refused; restricted; paused; the daily limit; empty or spaces | Composer stays pinned; a toast; a disabled composer with a notice, each case its own text | R-08, R-33, R-31 |
| CHAT-02 | e | Enter, Shift+Enter, and a Hebrew or Japanese keyboard mid-composition | Enter sends only outside composition | R-31 |
| CHAT-03 | e | 200 messages; new ones arrive while reading old ones | The scroll does not jump; own messages can be removed, others' can be reported | R-38, D-81 |
| CHAT-04 | e | Leave the chat open for a minute | No live updates (not in v1): at most one refresh per constant interval, plus on focus | PRODUCT.md |
