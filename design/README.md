# design/

The design of every screen, made before any screen is built. The look itself is
[docs/DESIGN.md](../docs/DESIGN.md); this folder holds the evidence and the mocks. Nothing here is
imported by `frontend/`, `backend/` or `infra/`, and the dead-code audit skips it. The mocks are plain
HTML, so their glass navigation is CSS only; the real app uses the `liquid-glass-react` library for it
([DESIGN.md](../docs/DESIGN.md), D-73).

## Look at it

```bash
npm run design
```

Open <http://localhost:4173/design/mocks/> (the screen viewer). It lists every screen and state,
and shows each in a frame of an exact width (360, 375, 768, 1024, 1280 px), in Hebrew or English.
Needs a network connection for the map tiles. A page also works on its own, for example
`map.html?state=spot&lang=en`; `?screen=`, `?state=` and `?sub=` choose the screen and its state.

On a phone, open the deployed copy: after a merge to `main` the deploy prints it as "Design mocks at
https://….cloudfront.net/design/", under the app's own address (D-89). The **Screen only** button
shows the chosen screen alone, at the phone's own width, with none of the viewer's controls; the
back gesture returns to the viewer.

## What is where

| Path | What |
|---|---|
| `briefs/` | The `shape` brief for each area, the direction record (`00-direction.md`) and the open questions with a recommendation each (`10-open-questions.md`) |
| `mocks/*.html` | One page per area: landing, legal, first run, map, spot and logging, cats, alerts, chat, profile, global states |
| `mocks/styles/` | `tokens.css` (the only place a colour, size or timing is chosen), `base.css`, `components.css`, `screens.css`, `responsive.css` (every width rule, breakpoints 768 and 1024 px) |
| `mocks/locales/` | Every string of the mocks, keyed, Hebrew and English with the same keys. `demo.*` keys are sample data that the API will supply |
| `mocks/icons.js` | The icon set: one 24 px grid, 2 px stroke |
| `mocks/design-system.html` | The design system on one page: every token and every component with its states (buttons: default, hover, pressed, focus, disabled, pending). English by default; `?lang=he` for right to left |
| `mocks/index.html`, `viewer.js`, `frame.html`, `serve.mjs` | Design tooling only: the viewer and a no-cache static server |
| `previews/` | Screenshots made while choosing the look; not tracked |

## Rules the mocks follow (the app's hard rules)

- Every string goes through a key (`data-t="map.title"`); the mock runtime only stands in for
  `t('key')`. Locale files are plain scripts here so pages also open from disk; in the app they become
  `he.json` and `en.json`.
- No inline styles. States switch by class or `data-*` attribute.
- CSS logical properties only (`margin-inline`, `inset-inline-start`); the map canvas alone is forced
  left to right.
- Works from 360 px up with no sideways scroll.

## Mock-only shortcuts

`mock.js` (language, state switching, icon and nav drawing), `demo.js` (sample spots around
central Tel Aviv: invented, not city data), the Leaflet script from a CDN, and photos drawn as
labelled placeholders. The app builds these properly in React, with the real API and an icon sprite file.

## Checks

`npm run verify` runs fallow on the mocks' stylesheets: a repeated block of declarations, a broken
reference or a hard-coded value that has a token fails it. Unused classes and over-complex selectors
(5 or more parts) show as warnings only: many classes are written by `mock.js`, which fallow cannot
read, and CSS-only checked tiles need a long selector. The mock scripts themselves are not checked.

## Using it in Phase 2

Read `docs/DESIGN.md` first, then the page you are building and its brief. Move `tokens.css` into
`frontend/src/styles/`, keep one stylesheet beside each component (CSS Modules), and keep the
breakpoints in one file. If a screen must change, change the mock and `DESIGN.md` first.
