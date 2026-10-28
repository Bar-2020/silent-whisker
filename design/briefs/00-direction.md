# Direction: the stairwell wall, in slate-blue glass

How the look was chosen (Impeccable `shape` → new-work, Operate mode). The result is in
[DESIGN.md](../../docs/DESIGN.md); this file keeps the reasoning.

## Decision record

1. The roll assigned candidate 6 of seven (below). The owner was not asked first; they objected
   ("why didn't you let me pick?"), so the look was put to them: the stairwell look as built, three
   other worlds from the list (street plate, White City, trail map) and the plain standard
   map-app look, rendered on the same screens.
2. The owner asked for the navigation to be **liquid glass, like the newest iOS**. Done: a floating
   tinted-glass bar on phones, a floating rail from 768 px, the form action bars the same glass.
3. The owner then asked for **the stairwell's dark blue on the street plate's pure white ground**.
   That is the look built, called F in the viewer's history and "slate blue on white" here. The other
   looks are in git history (commit "docs(design): look F") and no longer in the tree.

## Scene (forces light, not dark)

A volunteer crouches by a feeding station at dawn or dusk, in a courtyard or beside a stairwell,
phone in one hand and a bowl in the other, thumb only. Light swings from low sun glare to a single
streetlamp. The screen must read in glare first, so it is light with high contrast; night use is
served by contrast, not by a second theme (open question Q1).

## Seven grounded candidates (cultural home: Israeli streets and buildings)

Ordered by resonance with the audience. The Impeccable roll assigned number 6.

1. Survey of Israel / hiking-map sheet: sand ground, contour tints, trail colours.
2. Urban street-name plates: white lettering on blue enamel, Hebrew over Latin.
3. Israel National Trail blazes: stripes of paint on rock.
4. Tel Aviv White City: rendered walls, shuttered balconies, ribbon windows.
5. Encaustic cement tiles of old entrance halls.
6. **The apartment stairwell: a painted dado band below, white render above, a thin line between
   them.** (assigned, built)
7. Makolet hand-written shelf cards on bright stock.

## Why number 6 carries the product

Every Israeli volunteer knows the stairwell: oil-painted lower wall (sage, blue, grey), white above.
It is the cats' own territory, it is quiet, and it gives the shell a rule: **content on the white
wall, controls in the one deep slate-blue.** With the glass nav the painted band became a pane of
that blue floating over the page, so the map and the feed show through it. The world lends only what
Operate allows: palette (white, one slate blue, five state colours), type (plain system sans),
density (generous, 48 px targets) and one signature move (the glass pane; its top highlight is the
old chair-rail line). Navigation and controls stay standard.

## Challengers weighed (the roll dealt six; verdicts)

- Warm consumer app (soft cards, one action colour): **competitive**. Raise taken: the accent
  colour is only ever on something that can be tapped.
- Boarding pass and gate board: **declined**. Kept: tabular figures for the "last log 14 h ago".
- Timetable slide rack: **declined**. Kept: state is a mark in a fixed cell, never colour alone.
- Type specimen, catalog sleeve, acetate manual: **declined**.

## Direction contract

Also stored with `impeccable surface-brief` at `.impeccable/surfaces/design.md`.

- **THESIS:** content lives on a white wall, controls live on a floating pane of slate-blue glass.
  Refuses the cream-and-terracotta pet-app look, the neon-on-dark map look and the gamified
  volunteer look.
- **OWN-WORLD:** pure white ground, one slate-blue (shell, buttons, selection), five state colours
  with an icon each (green, orange, red, grey, plum for cat alerts), system sans, flat surfaces
  with 1 px lines, one soft lift and the glass for things that float.
- **STORY:** a stranger understands in seconds that a red pin needs food, that a log counts only
  when the phone is at the spot, and that nothing here shames a volunteer; then does one thing.
- **FIRST VIEWPORT:** the map full-bleed; a floating glass bar with four tabs; a pin card floating
  above it with the spot name, two state chips and one button; a round locate control and a round
  "+" above that.
- **FORM:** candidate 6 of 7, seed key e3601352.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review,
  the verdict, DESIGN.md, and every shipping raster carrying its provenance.
