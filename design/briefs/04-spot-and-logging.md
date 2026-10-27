# 4. Spot page, logging, empty reports, new spot

Mode: Operate. The reason the app exists.

## Job and audience
A volunteer standing at a spot. They must read "food: red, water: green" in a second, log what
they just did in two taps, and trust that it counted. Second audience: the person who adds a spot
that is not on a city list, and the admin who approves it.

## Outcome and proof
**Spot page** (phone: full screen with back; desktop: the panel): name, optional photo, exact
address, tags (city station, inactive, waiting for approval), two state rows (food, water) each
with a level chip (icon plus word), "last counted log 14 h ago, full bowl" in tabular figures, and
a "bowl is empty" button per row; then the **log form**; cats at the spot; chat entry; recent
history (unverified logs shown muted, Q17).

**Log form** (inline, not a modal): three large choices (full bowl, partial bowl, water), one
confirm button. A short note under it says the log counts only when the phone is at the spot and
that the location is not stored. The answer is only **counted** or **saved as unverified**, never
a distance. Refusals have their own plain messages: too soon (one counted feeding and one water
log per spot per 3 hours), daily log cap, daily attempt cap, rate limit, banned.

**Empty report**: "food is empty" or "water is empty", confirm, one neutral message whether it was
accepted or refused for any reason (one identical answer).

**New spot form**: optional name, optional photo (from the phone's own picker, resized on the
phone), place by typed address (looked up on submit) or by "use my location" (live, shows how
good the reading is), a one-line promise about who will see it, submit, then a "waiting for an
admin" state. Errors: address not found, location too vague, daily limit of 5, text refused.

**Creator**: rename, mark inactive or active. **Admin**: approve or reject pending, shown on the
spot page. **Everyone**: report a spot or photo (hides it from the reporter at once).

## States and ranges
Food and water each: green, orange, red, grey. Spot kinds: city station (read-only, no rename),
custom active, custom inactive, pending, hidden-or-missing (looks the same as not found). History:
0 to 30 rows. Name 1 to 60 characters, address 1 to 80.

## Interaction and layout
One column, sections separated by whitespace and a hairline, not cards in cards. Both log buttons
are at least 56 px tall. State rows stay above the fold on a 360 x 640 phone.

## Boundaries
No distance to the spot is shown (Q13). No photo on logs. No "undo" for a log (the server keeps
everything; Q-less, since the spec has no retract route).

## Open decisions
Q12 (who is named), Q13 (distance), Q14 (navigate link), Q15 (no reason on rejection), Q17
(unverified history).
