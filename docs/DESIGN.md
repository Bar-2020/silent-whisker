---
name: Silent Whisker
description: A quiet, glare-proof Hebrew-first volunteer map: white wall, one slate blue, floating glass navigation.
colors:
  wall: "#ffffff"
  surface-sunk: "#eef1f5"
  line: "#d3d9e2"
  line-strong: "#8e9bab"
  ink: "#1b2430"
  ink-soft: "#4a5563"
  ink-quiet: "#5f6b79"
  slate-blue: "#2d4467"
  slate-blue-deep: "#213553"
  slate-blue-tint: "#e3e9f3"
  slate-blue-quiet: "#c6d2e6"
  need-green: "#2d7a49"
  need-green-ink: "#1f5c36"
  need-green-tint: "#e0f0e5"
  need-orange: "#b4540a"
  need-orange-ink: "#8f4107"
  need-orange-tint: "#fbe8d4"
  need-red: "#c0282d"
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
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  glass: "28px"
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
- **Deep Slate** (#213553): pressed and hover states, the solid fallback of the glass.
- **Slate Mist** (#e3e9f3): chosen tiles, quiet notices, the avatar ground.
- **Slate Pale** (#c6d2e6): secondary text on the landing band.

### Secondary (state colours: meaning, not decoration)
- **Need Green** (#2d7a49) with ink #1f5c36 on tint #e0f0e5: food and water are fine.
- **Need Orange** (#b4540a) with ink #8f4107 on tint #fbe8d4: running low.
- **Need Red** (#c0282d) with ink #9a1f24 on tint #fbe0e0: food or water needed; also errors.
- **No-Data Grey** (#66707c) with ink #4d5762 on tint #e9ebee: no counted log yet, inactive,
  in review.

### Tertiary
- **Alert Plum** (#8a2a73) with ink #6d2159 on tint #f5e2ef: cat alerts and nothing else.
- **Here Blue** (#1c6fd1): the member's own position on the map. **Focus Blue** (#0b57d0): the
  keyboard focus ring.

### Neutral
- **Wall White** (#ffffff): every page and card. **Sunk** (#eef1f5): disabled fills, skeletons.
- **Line** (#d3d9e2) hairlines; **Line Strong** (#8e9bab) input borders.
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
- **Label** (600, 0.875 rem, 1.2): chips, tags, hints, meta lines. Never below 14 px except the
  nav label (13 px, 600).

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
- **Glass** (a tinted pane, see Components): the navigation and the form action bars. Fill
  `rgb(33 53 83 / 0.86)`, backdrop blur 20 px and saturate 1.6, a 1 px edge `rgb(255 255 255 /
  0.3)`, an inner top highlight `inset 0 1px 0 rgb(255 255 255 / 0.42)`. It falls back to a solid
  #213553 when `backdrop-filter` is unsupported or `prefers-reduced-transparency` is set.

### Named Rules
**The Float-Only Rule.** Depth means "this sits over the content". A resting card never has a
shadow.
**The Legible Glass Rule.** Glass is tinted dark enough (86%) that white labels keep at least 4.5:1
over a white map tile. Never make it clearer.

## Shapes

Rounded but sober. Controls 12 px, inputs and small tiles 8 px, cards and sheets 20 px, the glass
pane 28 px, chips and the language switch fully round. Avatars are circles. Map pins are teardrops
whose tip is the exact point; cat alerts are a rounded square on a short stem, so the two never
share a silhouette. Borders are 1 px (1.5 px on inputs and tiles); selection adds a 1 px inner ring
and a check mark, never a coloured side stripe.

## Components

### Buttons
- **Shape:** 12 px radius, 48 px tall (56 px for the primary action of a screen), 24 px side
  padding, label weight 600.
- **Primary:** slate blue fill, white label; pressed #213553. One per screen.
- **Secondary:** white fill, 1.5 px slate border, slate label.
- **Quiet:** no fill, slate label (back, cancel, "more").
- **Danger:** need-red fill, only for delete account.
- **On the glass:** a white button with a slate label, because slate on slate would vanish.
- **Disabled:** sunk fill, quiet ink, no pointer; the reason is stated nearby.

### Chips and tags
- **Chip:** pill, 28 px, state tint with state ink, an icon then a word ("Food: needed"). Used for
  levels, kinds, "in review".
- **Tag:** 8 px radius, 1 px line, quiet ink; dashed slate for "waiting for approval".

### Cards and containers
Used sparingly: a feed post (edge to edge on a phone, 12 px radius on wide screens), an alert row,
the map card. White, 1 px line, no shadow except over the map.

### Inputs and fields
- **Style:** 48 px, 1.5 px strong line, white fill, 8 px radius; label above (600), hint below.
- **Focus:** the border turns slate and a 3 px focus-blue ring appears.
- **Error:** the border turns need-red on a red tint, and an icon plus a sentence says what to do;
  never a toast for a field.
- **Choice tiles:** a real radio drawn as a large tile; chosen = slate mist fill, slate ring and a
  check mark. Used for log kind, alert kind, address or location.

### Navigation (the glass)
- **Phone bar:** 4 items, icon over a 13 px label, active item on a lighter pill (`rgb(255 255 255
  / 0.22)`), inactive in #e3eaf5. **Rail** (768 px up): the same pane vertical, the logo above, the
  language switch below. **Top bar** on inner pages: white, a hairline below, back arrow at the
  inline-start.
- **Action bar:** on a phone, the primary action of a form sits in the same glass, floating above
  the keyboard-safe area; on wide screens it is an ordinary inline button.

### Map markers (signature component)
A teardrop pin: the colour is the worse of food and water; the glyph is the bowl or the drop of
whichever drives it (both when tied); a corner badge repeats the level as a mark. Inactive pins are
62% opaque; a pin waiting for approval is white with a dashed slate outline. A cat alert is a plum
rounded square with a cat head and a text label ("In danger", "Sick"). The member's position is
a blue dot with a soft halo. Selected markers scale 1.2 and gain an ink outline.

### State row, log tiles, history
Each of food and water is a row: icon in a tinted circle, label, level chip, "last log 14 h ago,
full bowl" in tabular figures, and a quiet "the bowl is empty" button. The log form is three
large tiles (full bowl, partial bowl, water) and one button; the result is a notice, never a
distance.

### Notices and toasts
A tinted block with an icon and a title plus one sentence (what happened, what to do). Toasts are
ink-dark, bottom, one at a time. No coloured side stripes.

### Feed post, comment, chat message
Square photo, poster and place tag above it, like and comment counts below. Chat: others on the
plain wall with an avatar, own messages tinted slate mist; a message in review has a dashed outline
and a "in review" chip.

## Do's and Don'ts

### Do:
- **Do** keep slate blue for things that can be tapped or chosen (The Tap Rule).
- **Do** pair every state colour with an icon and a word, in markers, chips and notices.
- **Do** use gender-neutral Hebrew: nouns, infinitives and plurals, never a "you" verb.
- **Do** write errors as what happened and what to do next, in one or two plain sentences.
- **Do** keep targets at 48 px or more and primary actions inside the glass bar's thumb reach.
- **Do** let the glass fall back to solid when blur is off or transparency is reduced.
- **Do** run every string through `t('key')` and every style through a class or a `data-*`
  attribute; no inline styles.

### Don't:
- **Don't** use cream, terracotta, neon-on-dark or a gamified look (badges, streaks, levels). Stats
  carry no prize.
- **Don't** use a state colour on its own, or plum for anything but a cat alert.
- **Don't** show the distance to a spot or the result of the location check beyond "counted" or
  "saved as unverified".
- **Don't** put cat photos or any user photo on the map.
- **Don't** add a coloured side stripe to a card or notice, a gradient text, or a shadow on a
  resting card.
- **Don't** load a web font or a third-party script for chrome.
- **Don't** make the glass lighter than 86% opaque, or put text smaller than 14 px (13 px only for
  the nav label) on it.
