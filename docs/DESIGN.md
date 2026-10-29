---
name: Silent Whisker
description: A quiet, glare-proof Hebrew-first volunteer map: white wall, one slate blue, floating glass navigation.
colors:
  wall: "#ffffff"
  surface-sunk: "#eef1f5"
  line: "#d3d9e2"
  line-strong: "#8793a3"
  ink: "#1b2430"
  ink-soft: "#4a5563"
  ink-quiet: "#5f6b79"
  slate-blue: "#2d4467"
  slate-blue-deep: "#213553"
  slate-blue-tint: "#e3e9f3"
  slate-blue-quiet: "#c6d2e6"
  need-green: "#2a8f4f"
  need-green-ink: "#1f5c36"
  need-green-tint: "#e0f0e5"
  need-orange: "#d97706"
  need-orange-ink: "#8f4107"
  need-orange-tint: "#fbe8d4"
  need-red: "#d32f2f"
  need-red-ink: "#9a1f24"
  need-red-tint: "#fbe0e0"
  no-data-grey: "#66707c"
  no-data-grey-ink: "#4d5762"
  no-data-grey-tint: "#e9ebee"
  alert-plum: "#8a2a73"
  alert-plum-ink: "#6d2159"
  alert-plum-tint: "#f5e2ef"
  here-blue: "#1c6fd1"
  focus-blue: "#0b57d0"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "clamp(1.875rem, 6.2vw, 2.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  nav:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Hebrew', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  nav-item: "24px"
  glass: "28px"
  rail: "32px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "72px"
components:
  button-primary:
    backgroundColor: "{colors.slate-blue}"
    textColor: "{colors.wall}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 24px"
  button-primary-pressed:
    backgroundColor: "{colors.slate-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.slate-blue}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 24px"
  button-danger:
    backgroundColor: "{colors.need-red}"
    textColor: "{colors.wall}"
    rounded: "{rounded.md}"
    height: "48px"
  chip-state:
    backgroundColor: "{colors.need-red-tint}"
    textColor: "{colors.need-red-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "4px 12px 4px 8px"
  input-field:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "12px 16px"
  choice-tile:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "88px"
  choice-tile-chosen:
    backgroundColor: "{colors.slate-blue-tint}"
    textColor: "{colors.ink}"
  checkbox:
    backgroundColor: "{colors.wall}"
    rounded: "6px"
    height: "20px"
  checkbox-ticked:
    backgroundColor: "{colors.slate-blue}"
    textColor: "{colors.wall}"
  nav-glass-item-active:
    textColor: "{colors.wall}"
    rounded: "24px"
    height: "56px"
---

# Design System: Silent Whisker

## Overview

**Creative North Star: "The White Wall and the Blue Pane"**

Every Israeli volunteer knows the apartment stairwell: a white rendered wall above, an
oil-painted band below, cats asleep on the steps. This system keeps the wall white and puts every
control in one deep slate blue; the navigation is that blue turned into a floating pane of tinted
glass, so the map and the feed stay visible through it. The look is quiet on purpose. The
volunteer is outdoors, in glare, one-handed, often at dusk, with a bowl in the other hand. Markers
are the loudest thing on any screen; chrome never competes with them.

The system is Operate-first: plain controls, 48 px targets, a real type scale, state shown as
colour **and** an icon **and** a word. It borrows from the stairwell only a palette (white, one
slate blue), a density, and one signature move (the glass pane). Navigation, forms and lists stay
the standard ones a member already knows. The landing page is the one place the painted band
appears as a full-width section, where it frames the sign-in button.

**Key Characteristics:**
- White ground, one slate blue for everything tappable; the blue never appears on anything that is
  not a control or a selection.
- Five state colours, never alone: each always has an icon and a word (green fine, orange running
  low, red needed, grey no data, plum for a cat alert).
- Hebrew first and right to left; all layout in logical properties; the map canvas stays left to
  right because geography does not mirror.
- The phone's own system sans: no font download, no third-party request.
- Flat surfaces with 1 px lines; depth only for what floats (the lift) and the glass.

## Colors

A white ground, one slate blue, and five state colours that carry meaning only.

### Primary
- **Slate Blue** (#2d4467): buttons, the active selection, the nav glass tint, text links, the "+"
  and the landing page's painted band. Contrast on white 9.8:1.
- **Deep Slate** (#213553): pressed and hover states.
- **Slate Mist** (#e3e9f3): chosen tiles, quiet notices, the avatar ground.
- **Slate Pale** (#c6d2e6): secondary text on the landing band.

### Secondary (state colours: meaning, not decoration)
- **Need Green** (#2a8f4f) with ink #1f5c36 on tint #e0f0e5: food and water are fine.
- **Need Orange** (#d97706) with ink #8f4107 on tint #fbe8d4: running low.
- **Need Red** (#d32f2f) with ink #9a1f24 on tint #fbe0e0: food or water needed; also errors.
- **No-Data Grey** (#66707c) with ink #4d5762 on tint #e9ebee: no counted log yet, inactive,
  in review.

### Tertiary
- **Alert Plum** (#8a2a73) with ink #6d2159 on tint #f5e2ef: cat alerts and nothing else.
- **Here Blue** (#1c6fd1): the member's own position on the map. **Focus Blue** (#0b57d0): the
  keyboard focus ring.

### Neutral
- **Wall White** (#ffffff): every page and card. **Sunk** (#eef1f5): disabled fills, skeletons.
- **Line** (#d3d9e2) hairlines; **Line Strong** (#8793a3) input borders.
- **Ink** (#1b2430), **Ink Soft** (#4a5563), **Ink Quiet** (#5f6b79): text. All three pass 4.5:1 on
  white.

### Named Rules
**The Tap Rule.** Slate blue means "you can tap this" or "this is chosen". Nothing else is that
blue.
**The Never-Alone Rule.** A state colour is always paired with an icon and a word. A pin's colour
is repeated by a corner mark (tick, clock, exclamation, dash); a chip carries its icon and label.
**The One Plum Rule.** Plum is reserved for cat alerts so that an alert can never be mistaken for
a spot.

## Typography

**Display, headline, title, body, label:** the phone's own sans (`system-ui`, Segoe UI, SF, Roboto,
Noto Sans Hebrew), no download.

**Character:** plain and legible. Hebrew has no italics and no capitals, so emphasis is weight
only; letter-spacing is never set (it breaks Hebrew letterforms).

### Hierarchy
- **Display** (700, clamp 1.875 to 2.875 rem, 1.15): the landing headline only.
- **Headline** (700, 1.75 rem, 1.25): legal page titles.
- **Title** (700, 1.375 rem, 1.25): screen titles, the first-run questions.
- **Heading** (700, 1.125 rem, 1.3): section titles, top bar titles, sheet titles.
- **Body** (400, 1 rem, 1.5): everything else; line length at most 65 characters in reading text.
- **Label** (600, 0.875 rem, 1.2): chips, tags, hints, meta lines and the nav labels. Never below
  14 px; the one exception is the map's OpenStreetMap attribution (12 px, set by their terms).

### Named Rules
**The Tabular Time Rule.** Times, counts and distances use tabular figures so a column of "last
log 14 h ago" lines up.
**The Isolate Rule.** A name or a Latin word typed by a person sits in `<bdi>` (or an isolated
value) inside Hebrew text so its punctuation cannot jump across the sentence.

## Layout

One responsive app, mobile first, 360 px floor (also the iPhone XS at 375). Breakpoints 768 px
(rail, panels) and 1024 px (side-by-side map and page), written once in `responsive.css`. Spacing
is a 4 px step (4, 8, 12, 16, 24, 32, 48, 72). Pages are a single centred column, 40 rem at most
(30 rem for forms, 64 rem for admin lists), with 16 px gutters on a phone.

**Shell.** Phone: the content scrolls under a floating glass bar (4 tabs, 64 px, 12 px from the
edges and the bottom). From 768 px the bar becomes a floating rail at the inline-start (72 px).
Inner pages (spot, chat, forms) swap the tabs for a top bar with a back arrow; the rail stays on
wide screens. The map page is full-bleed, with a card (phone) or a 400 px panel (wide) over it.
**Every top bar carries the brand mark** (below), first when the bar has no back arrow and right after
it otherwise; on wide screens the rail carries it, so the bar does not repeat it. A form's main
button is on a **pinned bar** at the bottom of the screen (Components). On a phone the scrollbar is an
overlay, so it never runs up beside the top bar.

**Rhythm.** Tight inside a group (4 to 12 px), generous between sections (24 to 48 px), a hairline
between sections instead of a card around each. Cards are used only where one item is a
self-contained thing (a feed post, an alert row).

**RTL.** Back arrows, chevrons, tab order and sheet handles mirror; the map and the tile
attribution do not. Logical properties only (`margin-inline`, `inset-inline-start`,
`text-align: start`).

## Elevation & Depth

Flat by default: surfaces are white with a 1 px line. Two things float, and only those carry
depth.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 2px rgb(20 32 52 / 0.14), 0 6px 18px rgb(20 32 52 / 0.18)`): the
  map card and panel, the round map controls, toasts.
- **Light glass** (`rgb(255 255 255 / 0.64)`, blur 12 px, saturate 1.6, a white edge): everything
  else that floats over the map or the page with dark ink on it: the pin card and panel, the round
  map controls (all 52 px), the map search, menus, banners and the sticky top bar. **Dialogs and
  search results** use a whiter version (`rgb(255 255 255 / 0.84)`, blur 26 px, saturate 1.6) over a light
  scrim (30%), so the map or page shows through blurred and dark ink stays legible.
- **Glass** (a tinted pane, see Components): the navigation bar and rail only. Fill
  `rgb(36 60 103 / 0.58)` over a backdrop that is blurred 8 px, saturated 1.7 and dimmed to 56%
  (`backdrop-filter: blur(8px) saturate(1.7) brightness(0.56)`), a 1 px edge `rgb(255 255 255 /
  0.42)`, and inner highlights: a bright top rim `inset 0 1.5px 0 rgb(255 255 255 / 0.55)`, a faint
  bottom rim and a soft inner glow. The map and the page show through it. It falls back to a solid
  slate blue #2d4467 when `backdrop-filter` is unsupported or `prefers-reduced-transparency` is set.

**In the React app** the glass navigation is the library `liquid-glass-react` (MIT, D-73), used in one wrapper
component. It adds the lens-like bend and edge light the CSS cannot, in Chromium; Safari and Firefox get its blur and
edge light without the bend. The mocks are plain HTML, so they show only the CSS glass above; the real app wraps
the same content in the library. The CSS above stays as the fallback (blur off, reduced transparency) and as the
dim-then-tint around the library's clear glass, so labels stay legible. The library and Leaflet write inline `style`
attributes themselves (the libraries', not ours, D-33), so the content security policy must allow `style-src-attr`.

### Named Rules
**The Float-Only Rule.** Depth means "this sits over the content". A resting card never has a
shadow.
**The Legible Glass Rule.** The glass is see-through, but the backdrop is dimmed before the tint
is laid on, so its labels (#eef3fa, white when active) keep at least 4.5:1 even over a plain white
page (5.3:1 for the inactive labels and 4.6:1 for the active one over plain white; the active pill is
near that limit, so strengthen its edge, not its fill). If it is made clearer, dim the backdrop more; never trade away the
contrast.

## Shapes

Rounded but sober. Controls 12 px, inputs and small tiles 8 px, cards and sheets 20 px, the glass
pane 28 px, chips and the language switch fully round. Avatars are circles. Map pins are teardrops
whose tip is the exact point; cat alerts are a rounded square on a short stem, so the two never
share a silhouette. Borders are 1 px (1.5 px on inputs and tiles); selection adds a 1 px inner ring
and a check mark, never a coloured side stripe.

## Components

Every component below, with its states, is drawn in `design/mocks/design-system.html`.

### Buttons
- **Shape:** 12 px radius, 48 px tall (56 px for the primary action of a screen, 44 px for a
  small button inside a row or a card), 24 px side padding, label weight 600.
- **Primary:** slate blue fill, white label; pressed #213553. One per screen.
- **Secondary:** white fill, 1.5 px slate border, slate label.
- **Quiet:** no fill, slate label (back, cancel, "more").
- **Danger:** need-red fill, only for delete account.
- **Six states, every variant:** default, hover, pressed (darker fill, 1 px down), focus (3 px
  focus-blue ring with a 2 px gap), disabled and pending. Each one is drawn in
  `design/mocks/design-system.html`.
- **Disabled:** sunk fill (#eef1f5), grey ink, no pointer, no hover; the same everywhere, on the
  pinned bar too. The reason is always on the page: a hint nearby, or the label itself ("Already
  reported", "Reported empty"). A dull button with no clue is a bug. A form's main button is disabled
  while a required part is missing and nothing on the form says so (no photo, no place, a refused photo,
  a daily limit reached). A form that names each missing field after the press (the first-run profile)
  keeps its button enabled.
- **Pending:** every button that sends something to the server keeps its size and colour and shows
  **only a 20 px spinner**; the label stays in the page, invisible, so the width does not change and a
  screen reader still hears it. It takes no taps (`aria-busy="true"`, and the handler ignores Enter too) and still shows focus. In the
  app the pending state is the `isPending` flag of that action's TanStack Query mutation, never a
  flag kept by hand; the same mutation then drives the success and the error.

### Chips and tags
- **Chip:** pill, 28 px, state tint with state ink, an icon then a word ("Food: needed"). Used for
  levels, kinds, "in review" and "not verified" (both grey). A count (admin lists) is a slate-mist
  chip: slate means "tap", never a state.
- **Tag:** 8 px radius, 1 px line, quiet ink; dashed slate for "waiting for approval".

### Cards and containers
Used sparingly: the map card and a reported-content card in the admin list (white, 1 px line, no
shadow except over the map). A feed post, a single cat and an alert row have **no outline**: they are
separated by space (24 px between posts) or by a hairline between rows.

### Inputs and fields
- **Style:** 48 px, 1.5 px strong line, white fill, 8 px radius; label above (600), hint below.
- **Focus:** the border turns slate and a 3 px focus-blue ring appears.
- **Error:** the border turns need-red on a red tint and a plain sentence below the field says what
  to do: **no icon and no exclamation mark**. A refusal of a comment or a chat message is not a field
  error but a toast above the text box, so the box never moves.
- **Placeholder:** follows the page direction (at the right in Hebrew); words typed in the box choose
  their own direction.
- **Choice tiles:** a real radio drawn as a large tile; chosen = slate mist fill, slate ring and a
  check mark. Used for log kind, alert kind, address or location.

### Checkbox
A yes that must be given on purpose, such as the terms on the sign-up form (D-69). A 20 px rounded box
with a 2 px grey-blue edge that **always shows**, empty, before it is ticked; ticked is a slate blue fill
and a white check. The words sit beside it at 14 px, the box at the inline-start, one line of words as
tall as the box so the two stay centred together; the whole row is 48 px tall and a link inside the
words keeps its own tap while the rest of the line toggles the box. Keep the words short enough for one
line at 360 px in all four languages (the Russian reads "Принимаю условия и политику"). Unticked on submit, the box takes a red edge and
a pale red fill and the ordinary field error appears below it; disabled is grey. It is never a tile: a
tile hides its mark until it is chosen, so an unchosen tile does not look like a checkbox.

### Navigation (the glass)
- **Phone bar:** 4 items (Map, Explore, Alerts, Profile), icon over a 14 px label, active item on a lighter pill (`rgb(255 255 255
  / 0.12)` with a 1 px light edge, same label weight as the inactive items), inactive labels in #eef3fa, all 14 px. **Rail** (768 px up): the same pane vertical, the logo above, the
  language switch below. **Top bar:** white, a hairline below, the brand mark, then back arrow, title
  and at most two actions at the end (a plus to add, a pencil to edit, three dots for a menu).
- **Pinned action bar:** the main button of a form (and a small group such as Navigate and Show on
  map) is on a flat white bar at the bottom of the screen, always at the bottom even when the form is
  short, with no glass, line or shadow, above the safe area. The screen is as tall as the viewport, so
  the bar sits at the bottom of it. On wide screens it sits under the form instead. Two buttons share
  the width (primary first); one button takes it all.

### Brand mark
An **outline cat head**: round-cornered ears, a wide face, two dot eyes and a small triangular nose,
drawn in 2 px strokes (1.75 px at 32 px) with round caps and joins and no fill; it takes the colour of
the bar it sits on (slate on white, pale on the glass). It is the one mark for the rail, the landing
header, every top bar and the app-starting screen. The solid cat head is only for the plum alert sign
on the map. All icons are in `design/mocks/icons.js` and listed in `design-system.html`. **No icon is an exclamation
mark.** Each place has an icon that says what it means: a siren for a cat alert, an empty bowl or an empty
drop for a spot that needs food or water, a weak GPS target for a position that is not accurate enough, a
crossed-out target for location off, a crossed-out image for "no cat found", a circled cross for a refused
text, a thermometer for a sick cat.

### Dialogs and menus
- **Dialog:** a centred pane of light glass (26 rem at most, 20 px radius) over a light scrim, above everything. A
  title, one or two lines, then choices or buttons: big option rows (icon in a circle, a bold title and
  a line) or a primary button and a quiet Cancel. Used for the map "+" (new spot, or a cat alert),
  confirming approve or reject, confirming a report, reporting a problem with a spot, cancelling a log, removing your own content, the actions on a chat message (copy, report; an
  admin also restricts or bans) and the language.
- **Confirming something that cannot be undone** (deleting the account) is a dialog with a red button and
  a quiet Cancel, never a single tap on the pinned bar.
- **Menu:** a small floating card of 44 px rows (never more than three), for the three dots of a
  top bar or of a photo. Anything that needs a confirmation or more than three rows is a dialog.

### Language menu
A globe icon button (never a toggle, never the word "English") opens a list of the four languages (עברית, English, العربية, Русский, each in its own
script) with a check on the current one: on the landing and legal headers and at the foot of the rail. In the
profile the language is a row that opens a choice dialog.

### Map markers (signature component)
Every marker has the same 46 x 56 footprint and the same minimal drawing everywhere (map, legend,
landing, pickers). A spot is a plain teardrop in the state colour (the worse of food and water), with
no glyph and no badge: the card that opens, the legend and the marker's accessible name carry the
words (colour alone, see Q36). Inactive pins are 62% opaque; a pin waiting for approval is white with
a dashed slate outline. A cat alert is a plum rounded square on a stem with a solid cat head and a
text label ("In danger", "Sick"). **Spay or neuter** (the third alert kind, not urgent) is the same
sign, paler: a pale plum box with a plum outline and glyph, so it never shouts like a danger. The member's position is a blue dot with a soft halo. **Selected:**
the pin scales 1.2 and gets a 2.5 px dark slate outline, and the card shows that spot. Pins that
explain steps (the landing page) and the pins in a picker's list are not buttons and do not act like
one (no pointer).

### State row, log tiles, history
Each of food and water is a two-line row: icon in a tinted circle, label and level chip; then "14
hours ago, full bowl" in tabular figures. A small "the bowl is empty" button sits at the end of the
row, centred on both lines. When the level is already red the button is disabled and reads "Already
reported". The log form is three tiles (full bowl, partial bowl, water), two buttons ("I saw
kittens", "Injured or sick cat") and the Save button on the pinned bar, which turns pending while it
sends, with a toast saying the log counts only at the spot and the location is not stored; the
result is a notice, never a distance. For 10 minutes the notice has a **Cancel this log** button and the member's own row in History a quiet Cancel: both open a confirmation dialog (a red button, and "Keep the log" as the quiet one), then a grey notice says the spot is back as it was (R-37).

### Spot page
One screen on a phone: a top bar (back, name, share, menu), a head row (photo, address, **Navigate**), four
tabs (Log, Cats, Chat, History) and one panel. The tabs are four equal columns of 14 px centred
words. The Log tab fits 360 x 740 with nothing hidden under the pinned bar: two state rows, three
tiles, two buttons and the bar. **Cats:** a small "Share a photo here" button beside the title, then a
three-column grid of square photos. **Chat:** the real thread right in the tab, with the composer
pinned at the bottom: there is no button to another page. **History:** who logged what and when; a log
that was not verified is not listed. The share button sends the name and the link through the phone's share sheet (D-83). The menu has "Report a problem with this spot" (a dialog with four reasons: wrong place, gone, listed twice, something else; it hides nothing, D-81); the creator and every admin also get Edit,
and "Mark inactive": for a creator it is a request that needs an admin's approval (the spot stays
active meanwhile), for an admin it applies at once. **Navigate** is a small secondary button, a plain link to Google Maps
directions to the spot (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`, new tab): on a
phone with the Google Maps app it starts navigation, otherwise it shows the route on the Google Maps
site (D-57). No key, no SDK, nothing stored. Cat alerts get the same button.

### Map card
Opens when a pin is tapped: name and address, a 72 px photo at the inline-start (the spot's most
liked approved cat photo with its paw count, a placeholder when it has none, Q37), two state chips,
the time of the last log and one primary button to the spot page. The close X is a 44 px quiet
button at the inline-end corner of the title row, never over the photo.

### Notices and toasts
A tinted block with an icon and a title plus one sentence (what happened, what to do). Toasts are
ink-dark with white text, above the pinned bar or the text box, one at a time: a refused comment or
chat message, a sent report. A gentle refusal ("already logged
here", "not verified") is grey; red is for a spot that needs food or water and for real errors.
No coloured side stripes.

### Feed post, comment, chat message
Square photo with the place on it, then the name of the photo, who posted it, like and comment
pills and the time as the last line. A liked paw fills slate blue, never red, because red means a need.
Chat: others on the plain wall with an avatar, own messages tinted slate mist; a message in review has
a dashed outline and an "in review" chip. A message is one tap target: it opens a dialog (copy, report; on the member's own message copy and remove, with a confirmation),
there is no three-dots button on a message. The comment box and the chat composer are pinned to the
bottom of the screen in every state, including a limit, a restriction and a ban, where it is a notice.

### Explore (the feed)
Sharing starts from a **solid slate plus button at the end of the top bar** (like Instagram); there is
no banner above the feed. Each **post** has no outline: a square photo (a glass place chip bottom-start,
nothing else on it), then a title row with the photo's name (up to two lines) and the **three dots**
(report; the author gets "Remove my photo" instead; an admin also hides or restricts), who posted it, two pills and the time. The pills are
outlined when off and solid when on, so they never melt into the page: a **paw** to like (toes drawn
apart so none merge) and a speech bubble. With location off the feed shows cats from the member's own
city, and says so in a notice with a link to turn location on. Loading shows solid skeleton posts
(a photo block and two lines), never see-through ones.

### Share a photo, and where it was taken
A large dashed drop zone with a 72 px camera button; the picked photo shows without any label (and a
rejected one, "no cat found", is removed, so the zone is empty again). The **photo name is required**
(up to 40 characters, shown as a hint); **where it was taken is optional**: one row (pin icon, the
place, a chevron) that opens a picker with a **map and a list that are one choice**: a search box, "a
cat not at a spot", then nearby spots drawn with small pins, one selected at a time, picked on the map
or in the list, confirmed with a pinned button. When the post starts from a spot's page the place is
fixed and the row is disabled. The pinned **Share** button is disabled until there is a photo and a
name, and while a limit or a refusal stands. While the photo uploads a **process strip** under the top
bar says so (a spinner and words, no progress bar) and the button is pending. On a wide screen the page
is two columns, the photo then the name and place, 64 rem at most. A single cat has a full-width
photo (4:5, no outline) that opens full screen when tapped.

### Landing
A floating glass pill (the brand mark and name, three anchors on wide screens, the language globe, a
Sign in button) over a **hero band**: the slate, deep at one end and lifted at the other, lit by two soft
glows, running up under the pill (the only gradient in the product, and never on text). On a phone the
first screen is the pitch alone, with room around it (24 px gutters, 72 px between sections); a white
Sign-in button sits on the band. The phone frame (rounded bezel with a light rim, camera island, no side
buttons) around the live map starts one scroll below and **hangs half over the band and half over the
white page**; inside it the map leaves room under the island, so the island never covers the search
box. Then **three numbered steps** (the order matters): a number, a dashed line down (across on a wide
screen) to the next, the words, and a picture in the colour of the state it shows (a red pin, the bowl,
a green pin; the pins do not act like buttons). Then the privacy band, a tinted closing section of its
own, and a slate **footer** in the same colours as the hero, darker at the bottom: the mark and a one-line
promise, seven links in a grid (the contact address among them), a hairline, the licence line and "Made with a drawn heart by Bar Almog" (the
heart is an icon, not an emoji).

### Map search, alerts, profile
- **Map search:** a pill field at the top of the map (the legend "?" beside it); typing lists feeding
  spots by name, then places (cities, streets, house addresses), one row each with its kind; no results
  says so and what to try. The two action buttons sit at the right in both languages on a phone, and
  disappear while a spot or an alert is selected. Banners (zoom in, location off) sit under the top
  row, and "location off" is one row: a crossed-out target, the words and the "Turn on" button at the end.
  **The map credit** ("© OpenStreetMap", linked to their copyright page) shows in the bottom corner away
  from the action buttons when a map opens, folds into a small (i) button after five seconds, and the (i)
  shows it again (OpenStreetMap's attribution guidelines allow this; their tile policy forbids hiding it
  behind a toggle from the start, so it never starts hidden). The legend repeats it.
- **Spots list:** a round list button at the head of the map controls swaps the map for the list of the same spots (kittens seen first, then needing help, then nearest), each row a real link with its state chip (icon and word) and its distance; the same button, now a map icon, goes back (D-82).
- **Alert row:** photo and words on top (kind chip, "reported N hours ago", the note cut at two lines,
  distance and area), then **Details** and **Show on map** side by side, full width. A countdown is
  never shown for helping a cat; only a gentle "leaves the map in N minutes" when it is about to go.
  Past alerts (the last 7 days) are one tap away, visible to everyone. In the raise form "sick" has a
  thermometer; a vague or missing location offers **Try again**; a refused note says so under the box.
  One alert: it has its own address and a share button in the top bar (D-83); the member who raised it sees "Mark as handled" under it, an admin sees the admin actions (D-84), **Navigate** and **Show on map** are on the pinned bar.
  **Spay or neuter** is the third kind in the raise form (D-64): a calm full-width row under the two
  urgent tiles, a medical-cross icon, "not urgent". It stays 7 days instead of 6 hours, so its row says
  "reported N days ago" and its in-review screen says "7 days"; it has its own paler sign on the map and a
  line in the legend.
- **Profile:** a pencil in the top bar edits; "My activity" is a tinted card with no dividers and 24 px at
  the sides; one
  list holds language (a dialog of four), location, **Install as an app** (a guide per browser; the same guide is a screen of the first run, D-01), sign out and delete. The support group starts with **Contact**, the public email (D-74).
  Location help shows, per browser (Android Chrome, iPhone Safari, Chrome, Edge, Firefox, Safari on a
  Mac), how to allow it **permanently**, not "this time". Lists in the admin screens use the same row layout, sorted nearest first with a distance on each row (D-78), and a report card is a grid: decisions on one row, member actions on the next (lifting a chat restriction or a block when there is one, D-81). A report of a spot problem shows its reason and the buttons "Edit" and "Close the report".

### Photo placeholders
In the mocks a photo is a pale placeholder in one of four tones (#dfe4ec, #e6e2d8, #d9e4de,
#e4dce6) with a cat glyph and a "sample photo" label. The app shows real photos and uses the
sunk grey (#eef1f5) while one loads.

## Do's and Don'ts

### Do:
- **Do** keep slate blue for things that can be tapped or chosen (The Tap Rule).
- **Do** pair every state colour with an icon and a word, in chips and notices (map pins are the
  one exception: the card and the legend carry the words).
- **Do** use gender-neutral Hebrew, Arabic and Russian: nouns, infinitives and plurals, never a "you" verb.
- **Do** write errors as what happened and what to do next, in one or two plain sentences.
- **Do** keep targets at 48 px or more (44 px for small buttons) and primary actions on the pinned
  bar, inside the thumb's reach.
- **Do** let the glass fall back to solid when blur is off or transparency is reduced.
- **Do** run every string through `t('key')` and every style through a class or a `data-*`
  attribute; no inline styles.
- **Do** name every photo link and photo button by the photo's own name, and every icon-only control by
  what it does; a map marker is named by the spot and its state, and the member's position by "your
  location".
- **Do** keep the focus ring white on slate (the bars, the landing band, the footer, the full-screen
  photo) and blue on white, at least 3:1 against what is behind it.
- **Do** make a three-dots menu a disclosure (`aria-expanded`, `aria-controls`), not `role="menu"`, and
  name a dialog by its purpose ("Message actions"), not by the first line inside it.
- **Do** give a selected or pressed state more than a fill or a shadow, so forced-colours mode shows it
  (an outline), and give every pane of glass a solid fallback for no blur and for reduced transparency.
- **Do** set the page title to the screen's title, so a tab or a history list names it.

### Don't:
- **Don't** use cream, terracotta, neon-on-dark or a gamified look (badges, streaks, levels). Stats
  carry no prize.
- **Don't** use a state colour on its own (except the colour of a map pin), or plum for anything but
  a cat alert.
- **Don't** show the distance to a spot or the result of the location check beyond "counted" or
  "saved as unverified".
- **Don't** put cat photos or any user photo on the map itself (pins, layers). The card that opens
  from a spot may show its most liked approved cat photo (Q37).
- **Don't** add a coloured side stripe to a card or notice, a gradient text, or a shadow on a
  resting card.
- **Don't** load a web font or a third-party script for chrome.
- **Don't** let the glass fall below 4.5:1 for its labels (dim the backdrop rather than raise the
  tint), or put text smaller than 14 px on it.
