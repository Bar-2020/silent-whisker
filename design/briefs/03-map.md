# 3. Map

Mode: Operate. The home screen and the volunteer's main tool.

## Job and audience
A member walking a route wants to see at a glance which spots need food or water and where a cat
alert is, then pick one and go. Used in glare, one-handed, often while moving.

## Outcome and proof
- Opens centred on the member's profile city (their phone position once granted).
- **Spot markers**: one per spot, a pin whose tip is the exact point. Colour = the worse of food
  and water (red, orange, green; grey only when the spot has no data at all). The glyph is the
  bowl or the drop of whichever drives the colour (both when tied). A corner badge repeats the
  level as a mark (cross, half, tick, dash) so colour is never the only signal. Inactive spots are
  drawn quiet, pending spots (creator and admins only) dashed.
- **Cat alert markers**: a different silhouette (a rounded sign on a stem, plum) with a cat-and-!
  glyph and a text label ("danger" or "sick") next to it. Never shown as a spot.
- Cat photos are never on the map.
- Tapping a marker opens a sheet (phone) or a panel (desktop) with the essentials and one button to
  the full page.

## Selected direction
Full-bleed OpenStreetMap tiles softened by a CSS filter (Q4), the band nav, two round controls.
Markers are the loudest thing on the screen; chrome stays quiet.

## States and ranges
Default; spot selected; cat alert selected; many pins (zoom hint when the area holds more than the
cell limit: "zoom in to see spots"); location unavailable (the "my location" control explains,
does not nag); map tiles failing (grey ground, markers still work); empty area ("no spots here
yet"); admin view (pending spots dashed, with approve and reject in the sheet). Ranges: 0 to about
60 markers in view.

## Interaction and layout
Phone: bottom sheet that peeks above the band, drag up for details is replaced by one explicit
"details" button (drag gestures fight map panning). Controls: locate (round, white), "+" (round,
band colour, opens a two-item menu: new spot, cat alert), legend "?" (small, top). Tablet and
desktop: side rail replaces the bottom band; the sheet becomes a 400 px panel at the inline-start
of the map area.

## Boundaries
No filters, no search, no spot list: the spec has none (Q30). No clustering decisions here: the
spec's answer to too many pins is the zoom hint.

## Open decisions
Q4 (tiles), Q5 (the "+" menu), Q6 (admin lists), Q30 (a list for people who cannot use a map).
