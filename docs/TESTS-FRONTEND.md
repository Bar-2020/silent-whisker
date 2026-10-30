# Test scenarios: the app around the screens

Layers and how to cite: [TESTING.md](TESTING.md). Browser rows run on Chromium and WebKit at phone and desktop sizes
unless a row says otherwise.

## Shell, sign-in and errors (SHELL)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| SHELL-01 | e | Signed out: open `/`, `/privacy`, `/terms`, then `/spots/x`, `/profile`, `/alerts/x` | The first three open; the rest go to Google and come back to the same page afterwards | R-22, D-83 |
| SHELL-02 | e | Watch the network on the public pages | No call to `/api/` | R-22 |
| SHELL-03 | e | `/auth/callback` with a good code, `access_denied`, a wrong `state`, a reused code, no parameters | Back to the page; a plain retry screen; refused; refused; refused; never a loop | D-59 |
| SHELL-04 | e | The ID token expires mid-session; two tabs refresh together; the refresh token is revoked | Silent refresh that stores the new refresh token each time; no sign-out loop; back to sign-in with the return page kept | D-59 |
| SHELL-05 | e | Sign out, then a second member signs in on the same phone | Tokens, query cache and storage hold nothing of the first; the back button shows no earlier page | D-59, R-22 |
| SHELL-06 | c | The API answers `401`, `FORBIDDEN`, `BANNED`, `TERMS_REQUIRED`, bare `429`, `RATE_LIMITED` with and without `Retry-After`, `5xx`, no connection | Session-expired state; admin controls hidden; plain notice; the accept-terms step; wait the default time; wait `Retry-After`; retry message; nothing queued | R-36, R-21, D-60, D-72 |
| SHELL-07 | e | Four destinations, a spot page, a form; deep links to `/spots/{id}` and `/alerts/{id}` | Map, Cats, Alerts, Me; inner pages swap the tabs for a top bar; a link a member may not see shows the same not-found page as a missing one | D-83, R-03 |
| SHELL-08 | e | The glass navigation with blur off, with reduced transparency, and in each engine | Solid fallback; labels readable over any map tile; our code writes no inline style | D-73 |
| SHELL-09 | c | `/locales/he.json` fails (network, 404, bad JSON) with and without a cached copy | An icon-only retry screen; the cached copy used when there is one; no hardcoded text | D-32 |
| SHELL-10 | d | An address with no file extension, one with an extension that is missing, `/api/nothing` | The app; a plain error; an API error, not the web page | D-63 |
| SHELL-11 | e | Console and `securitypolicyviolation` events through every journey | None | D-59 |

## Languages and direction (I18N)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| I18N-01 | u | Compare `he`, `en`, `ar`, `ru`: keys, plural forms (Hebrew "two", Arabic six forms, Russian four), placeholders, empty values, untranslated Latin text | Same keys and placeholders; the right plural forms per language; nothing empty | R-19, D-85 |
| I18N-02 | u | Every `t('key')` in the source | Exists in the files (`tsc`); keys used nowhere are reported | R-19 |
| I18N-03 | e | Switch language on each screen; reload | The whole screen changes without a reload and the choice stays; `<html lang dir>` right; Hebrew by default | D-85, D-32 |
| I18N-04 | e | Every screen in Hebrew and Arabic | Mirrored back arrow, chevrons and tab order; the map canvas stays left to right; no `left` or `right` in our CSS | D-56 |
| I18N-05 | e | A spot called `Café Roma`, a Hebrew name with Latin letters, a name with `U+202E`, in lists and cards | Order is right, and the name cannot reorder the text around it | D-56 |
| I18N-06 | e | Longest values: 35 character name and city, 60 character spot name, 40 character cat name, 140 character note, Russian text | No overflow and nothing cut off at 360 px | R-18 |
| I18N-07 | m | Copy review: a native speaker reads Arabic and Russian; the gender-neutral rule | Not automatable: a checklist item before launch | D-85 |

## Sizes (RESP)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| RESP-01 | e | Every screen and state at 360 x 740, 375 x 812, 768, 1024 and 1440 | `scrollWidth` is not over `clientWidth`; no box leaves the screen | R-18 |
| RESP-02 | e | The Log tab at 360 x 740; the state rows at 360 x 640; the save button | Fits; above the fold; at least 56 px tall, with nothing hidden under the bar | R-18, D-67 |
| RESP-03 | e | Resize across 767 to 768 and 1023 to 1024 | Bar becomes rail; the 400 px panel appears; breakpoints exist only in `frontend/src/styles/` | D-30 |
| RESP-04 | e | Text at 200%, landscape phone, the keyboard open on a form | The primary button stays reachable | R-18 |
| RESP-05 | e | WebKit: safe areas, `dvh`, a fixed bar with the keyboard | Nothing hidden (a real iPhone is checked by hand before launch) | R-18 |

## Accessibility (A11Y)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| A11Y-01 | e | An axe scan of every screen and state (empty, error, loading, dialog) in Hebrew and English | No serious or critical finding | D-56 |
| A11Y-02 | e | Keyboard only through every flow, also in right to left | Everything reachable, focus order follows the page, dialogs trap and return focus, Esc closes | D-56 |
| A11Y-03 | e | Marker and chip states, with a colour-vision filter | Every state carries a word; the pin's accessible name has the words | D-57, D-14 |
| A11Y-04 | u | Colour pairs of the design tokens | Text pairs reach AA contrast | D-56 |
| A11Y-05 | c | Errors, toasts, reduced motion, icon-only buttons | Announced and tied to their field; motion reduced; every icon button has a translated name | D-58 |

## First run (FIRST)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| FIRST-01 | e | First sign-in, then close the tab after each step and return | Order: sign-up form, install guide, location, map; each resumes at its step; the map is out of reach until terms are accepted | R-36, D-31 |
| FIRST-02 | c | The sign-up form empty, filled, with only the box unticked, with name 1 and 36 characters | Errors in words under the field, the unticked box red; neither photo answer pre-selected; the photo question hidden with no Google photo | D-69, D-27, D-61 |
| FIRST-03 | c | Double click the submit button; the answer takes 3 seconds | One request; the button shows a spinner while pending | D-57 |
| FIRST-04 | e | The server answers `MODERATION_REJECTED`, `CITY_NOT_FOUND`, `CHECK_UNAVAILABLE`, `DAILY_LIMIT`, 429, offline | Each its own plain message; a refused name shows the contact address; the form keeps its values | D-62, D-74 |
| FIRST-05 | e | The location screen: granted, denied, ignored, already granted, no geolocation in the browser | Map at the phone; city map with a one-line notice; never blocks; screen skipped; still works. Shown once per device; "continue" disabled while the prompt is open | D-31 |
| FIRST-06 | e | The install guide on iPhone, Android, Chrome or Edge, Safari on a Mac, and an unknown browser | The right guide, or the list; Continue works; "later from Profile" is true | D-01 |

## Profile (ME)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| ME-01 | e | Open Profile; edit name, city and the photo choice; log, cancel and log again | Values and stats match the server, including the drop after a cancel; the edit is checked again | D-27, R-37 |
| ME-02 | e | A banned member in every screen | A permanent notice in Profile; every write refused with a plain message; reads and the feed work; delete account works | R-08, D-72 |
| ME-03 | e | Delete the account: cancel, confirm, sign in again | Cancel keeps it; confirm signs out to the landing page; signing in again starts the first-run steps from the beginning | D-71 |
| ME-04 | e | The admin group as admin and member, with and without location; clear the flag | Only admins see it, at the top: pending spots, requests, reports, nearest first, or oldest first with no location; gone after the flag is cleared; a typed URL shows nothing | D-78 |
| ME-05 | c | Avatar: chosen photo, broken address, names in Hebrew, Arabic, Russian, emoji | Falls back to initials, taken as characters, never half an emoji | D-21 |
| ME-06 | e | Location help in Profile after a denial | Says how to turn it back on, per browser | D-31 |

## Landing and legal (LAND)

| ID | L | Do this | Expect | Rule |
|---|---|---|---|---|
| LAND-01 | e | The landing page in four languages; the sign-in button | Hero, steps and footer; the button goes to Google with `identity_provider`, `code_challenge`, `state` and no implicit flow | D-59 |
| LAND-02 | e | A visit from the EU, with the consent banner untouched, declined, accepted | No ad request before consent; declining non-essential is the default; no ad request on any signed-in page | PRODUCT.md |
| LAND-03 | d | Response headers of every page | A strict Content-Security-Policy, `X-Content-Type-Options`, a referrer policy, HSTS | D-59 |
| LAND-04 | d | The terms and policy text | Carries no "sample" marker once the owner's text is in; the version matches `terms_version` | D-68, D-69 |
