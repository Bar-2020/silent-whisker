# 4. Spot page, logging, empty reports, new spot

Mode: Operate. The reason the app exists.

## Job and audience
A volunteer standing at a spot. They must read "food: red, water: green" in a second, log what
they just did in two taps, and trust that it counted. Second audience: the person who adds a spot
that is not on a city list, and the admin who approves it.

## Outcome and proof
**Spot page** (phone: full screen with back; desktop: the panel): name, optional photo, exact
address, tags (city station, inactive, waiting for approval, kittens seen), two state rows (food, water) each
with a level chip (icon plus word), "last counted log 14 h ago, full bowl" in tabular figures, and
a "bowl is empty" button per row (disabled and reading "Already reported" once the row is red); then
the **log form**. On a phone these are four tabs (Log, Cats, Chat, History) and the save bar stays
pinned at the bottom, so the button is always on screen (the Log tab fits 360 x 740 and nothing hides under it, D-67). The spot has its own page address, `/spots/{id}`, and a share button in the top bar sends the name and the link through the phone's share sheet, never the address (D-83). A **Navigate** button starts Google Maps directions to the
spot (navigation in the app on a phone, the route on the website otherwise, D-57). The Cats tab is a
three-column photo grid with a "share a photo here" button beside its title; the Chat tab is the real thread with its
composer pinned; the History tab does not list unverified logs.

**Log form** (inline, not a modal): three large choices (full bowl, partial bowl, water), one
confirm button (the pinned bar, pending while it sends, so a double tap cannot log twice). While it sends, a short toast says the log counts only when the phone is at the spot and
that the location is not stored. The answer is only **counted** or **saved as unverified**, never
a distance. For 10 minutes the logger can **cancel** their own log, from the notice and from their row in History: a confirmation dialog, then a grey notice that the spot is back as it was (R-37, D-79). Refusals have their own plain messages: too soon (one counted feeding and one water
log per spot per 3 hours), daily log cap, daily attempt cap, rate limit, banned. No connection: the form keeps
its choices and says it could not confirm the save; nothing is queued (D-67). Under the three choices,
two buttons (D-67): "I saw kittens", a report of its own that needs no log (disabled and reading "Kittens
already reported" while the tag shows; the tag also appears on a search result), and "Injured or sick cat",
which opens the cat alert form and returns to the spot.

**Empty report**: "food is empty" or "water is empty", confirm, one neutral message whether it was
accepted or refused for any reason (one identical answer).

**New spot form**: optional name, optional photo (from the phone's own picker, resized on the
phone), place by typed address (looked up on submit) or by "use my location" (live, shows how
good the reading is), a one-line promise about who will see it, a short tip to pick a quiet,
out-of-the-way place (D-68), submit, then a "waiting for an
admin" state. Errors: address not found, location too vague, daily limit of 5, text refused.

**Creator and admin**: edit (rename, active or inactive). A creator's "inactive" is a request that
needs an admin (Q40); an admin's applies at once. **Admin**: approve or reject pending (each asks for a
confirmation), shown on the spot page. **Everyone**: "report a problem with this spot" in the menu: a dialog with four reasons (wrong place, gone, listed twice, something else), then a toast; it hides nothing and waits in the admin list (D-81). Reporting a photo hides it from the reporter at once.

## States and ranges
Food and water each: green, orange, red, grey. Spot kinds: city station (read-only, no rename),
custom active, custom inactive, pending, hidden-or-missing (looks the same as not found). History:
0 to 30 rows. Name 1 to 60 characters, address 1 to 80.

## Interaction and layout
One column, sections separated by whitespace and a hairline, not cards in cards. Both log buttons
are at least 56 px tall. State rows stay above the fold on a 360 x 640 phone.

## Boundaries
No distance to the spot is shown (Q13). No photo on logs. Undo is only for the logger's own log, and only for 10 minutes. A "this spot was empty" report has no undo in this version. Pending design change (D-89): the log form gains one optional tap, what was left on arrival (none, some, plenty), for feeding and water; the form, the spot mock and DESIGN.md are updated before Phase 4 (D-55).

## Open decisions
Q12 (names are shown in full, decided), Q13 (distance), Q14 (navigate link), Q15 (no reason on rejection), Q17
(unverified history: decided, not shown), Q40 (inactive needs an admin).
