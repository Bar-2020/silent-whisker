# 3. Map

Mode: Operate. The home screen and the volunteer's main tool.

## Job and audience
A member walking a route wants to see at a glance which spots need food or water and where a cat
alert is, then pick one and go. Used in glare, one-handed, often while moving.

## Outcome and proof
- Opens centred on the member's profile city (their phone position once granted).
- **Spot markers**: one per spot, a pin whose tip is the exact point. Colour = the worse of food
  and water (red, orange, green; grey only when the spot has no data at all). The pin is colour only (D-57, Q36):
  no glyph, no badge; the card and the legend carry the words. The selected pin is larger with a dark
  outline. Inactive spots are drawn quiet, pending spots (creator and admins only) dashed.
- **Cat alert markers**: a different silhouette (a rounded sign on a stem, plum) with a cat-and-!
  glyph and a text label ("danger" or "sick") next to it. Never shown as a spot.
- Cat photos are never on the map.
- Tapping a marker opens a sheet (phone) or a panel (desktop) with the essentials (a small photo, the
  spot's most liked approved one, Q37; two state chips; the last log) and one button to the full
  page. The close X sits at the inline-end corner of the title row.
- The "+" button opens a dialog: "New feeding spot" (the new spot form) and "Report a cat"
  (the cat alert form: in danger, sick, or spay or neuter); both screens are in the mocks. A search box sits at the top (Q38), and a round button switches the map to a list of the same spots (D-82). The two
  action buttons sit at the right on a phone and hide while a card is open. The map credit shows in a
  corner and folds into an (i) after five seconds (Q43).

## Selected direction
Full-bleed OpenStreetMap tiles softened by a CSS filter (Q4), the glass nav, two round controls.
Markers are the loudest thing on the screen; chrome stays quiet.

## States and ranges
Default; list view (the spots of the current view: needing help first, then nearest, each row a real button, D-82); spot selected; cat alert selected; many pins (zoom hint when the area holds more than the
cell limit: "zoom in to see spots"); location unavailable (the "my location" control explains,
does not nag); map tiles failing (grey ground, markers still work); empty area ("no spots here
yet"); admin view (pending spots dashed, with approve and reject in the sheet). Ranges: 0 to about
60 markers in view.

## Interaction and layout
Phone: a card that floats above the glass bar, drag up for details is replaced by one explicit
"details" button (drag gestures fight map panning). Controls: locate (round, white), "+" (round,
slate blue, opens a two-item menu: new spot, cat alert), legend "?" (small, top). Tablet and
desktop: a side rail replaces the bottom bar; the sheet becomes a 400 px panel at the inline-start
of the map area.

## Boundaries
No filters. The list view is the same data as the map, not a second source (Q30, D-82). The search is a box, not a list (Q38). No clustering decisions here: the
spec's answer to too many pins is the zoom hint.

## Open decisions
Q4 (tiles), Q5 (the "+" menu), Q6 (admin lists, decided).
