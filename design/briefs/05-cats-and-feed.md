# 5. Cats and the feed

Mode: Experience-lite inside an Operate app: photos lead, chrome recedes.

## Job and audience
A member scrolls recent cat photos from their area, likes and comments, and posts their own.
This is the warm part of the app and the reward for the volunteering; it must stay clearly apart
from the map (cat photos are never on the map).

## Outcome and proof
- **Feed**: a plus button in the top bar starts a post (no banner), then a single column of posts with
  no outline: photo (square) with a place chip, the photo's name and the three dots, poster, like and
  comments pills, and the time last. With location off it shows the member's own city (Q43). Infinite scroll, 20 at a time. Unseen photos first, then repeats; no divider
  is required (Q20).
- **Post a cat**: choose a photo from the phone's own picker, preview, a required photo name (Q41), an
  optional place: a picker with a map and a list, one choice (fixed when the post starts at a spot). Photo check outcomes: in review (hidden until approved), "no cat found" (the
  photo is rejected), refused, daily photo limit of 10, daily upload limit of 20.
- **Cat page**: full-width photo that opens full screen, like, comments (newest first, divided), a
  comment box pinned at the bottom (a refusal is a toast), the daily comment limit and the
  chat-restricted state, report.

## Selected direction
Photos are the only large colour on these screens. Cards are the container here because each post
is one self-contained thing; no cards inside cards. The like control is the one place the accent
is not a button fill: a plain heart that fills.

## States and ranges
Loading (skeleton at the photo ratio), empty ("nothing near you in the last 7 days"), end,
own post in review (visible only to the poster, Q18), photo failing to load, comments 0 to 200,
comment in review, comment refused, restricted.

## Interaction and layout
Phone: full-width cards, 12 px gaps. Tablet: single column 560 px, centred. Desktop: same column
plus a context column at the inline-end with the "post a cat" button and a short "how the feed
works" note (7 days, about 25 km, most liked first).

## Boundaries
No follows, no hashtags, no shares, no profile pages of other members. No delete route in the spec
(Q19).

## Open decisions
Q16 (the spot picker), Q18, Q19, Q20.
