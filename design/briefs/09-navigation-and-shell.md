# 9. Navigation and shell

Mode: Operate. This is what the other eight areas sit in.

## Job and audience
Every member, every screen. The shell must make the four jobs one tap apart and must keep the
map visible while the member reads or logs.

## Outcome and proof
- **Four destinations**: Map, Cats (feed), Alerts, Me. Chat has no tab: it lives inside a spot
  (chat is per spot only). New things are made from "+" on the map, "post a cat" in Cats, "raise
  an alert" in Alerts, and "new spot" in the "+" menu.
- **Phone** (up to 767 px): a floating pane of slate-blue glass, 12 px in from the screen edges,
  holds the four tabs, 64 px tall, icon above a word. The map and pages scroll behind it. Inner pages (spot, chat, forms) replace the tabs with a top bar: the brand mark, back arrow,
  title, and at most two actions at the inline-end. A form's main button is on a flat pinned bar.
- **Tablet and desktop** (768 px and up): the glass becomes a floating rail at the inline-start (72
  px, icon above a word, the logo at the top, the language switch at the bottom). The map area keeps a
  400 px side panel at the inline-start of the map; content pages sit in a centred column.
- **Global states**: loading skeleton; no connection (offline mode is not v1, so a clear message
  and a retry); rate limit (429: how long to wait); session expired (back to sign-in); the
  language files failing to load (an icon-only retry screen, since no text can be hardcoded);
  not found; banned (writes refused with a plain message).

## Selected direction
The glass pane is the system's signature: tinted slate-blue (72% fill over a blurred, dimmed backdrop, with a light
edge and a bright top rim) so the map shows through and white labels stay readable. Form action bars are not glass: a flat white pinned bar. Active tab: a lighter pill; inactive: pale. Solid blue where blur is unavailable
or reduced transparency is on.

## Responsive and RTL
360 px is the floor (also the iPhone XS at 375 px). Breakpoints: 768 px and 1024 px, written once.
Hebrew is the default direction; the back arrow, the chevrons and the tab order mirror. The map
canvas itself stays left-to-right (geography does not mirror). Numbers, Latin names and times use
`dir="auto"` or `<bdi>` inside Hebrew text.

## Boundaries
No hamburger drawer, no top search bar (the spec has none), no custom install banner (Q28). A spot and an alert are their own pages with their own address, so the route changes when one opens and its link can be shared (D-79). The language switch is a list of four.

## Open decisions
Q5.
