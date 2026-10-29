# Product

<!-- impeccable:product-schema 1 -->

Silent Whisker is a free, open-source web app (installable PWA) where volunteers map stray-cat
feeding spots, log feedings and water, flag cats in danger, and chat. Hebrew first, English
second. Israel first.

## Platform

web

## Stack

React, Vite, TypeScript, TanStack Query, react-leaflet, react-i18next, liquid-glass-react (the glass navigation,
D-73). AWS: S3 + CloudFront, Lambda, DynamoDB, Cognito. Terraform, deployed from GitHub Actions with a deploy-only key (D-02).

## Who uses it

- **Member** (signed in with Google): everyone who uses the app. Sees city stations and cat alerts,
  and custom spots when nearby or when they need food or water (D-47). Signed-out people see only a landing page,
  the privacy policy and the terms (D-39).
- **Custom spot creator**: the member who added a custom spot. Can rename it, and ask an admin to mark it inactive (R-32).
- **Admin**: a member with an admin flag, set by hand (D-78). Approves custom spots, bans and unbans, restricts chat,
  extends cat alerts, works through reports. Buttons in the normal screens, plus one admin-only group in Profile listing what waits, nearest first (D-78, D-81).

## v1 scope

1. **Map** (Leaflet + OpenStreetMap): feeding spots (official and custom) and cat alerts, never cat photos
   (D-45). Spots that most need food or water are highlighted, based on time since the last counted log and whether the spot is active. A search finds a city, street, address or spot name (D-58); a list view shows the same spots by need, then distance (D-82); the OpenStreetMap credit stays visible on the map.
2. **Spot**: name (the custom spot creator's, or generated from the street), photo, exact address. On the map,
   every spot is an exact point (D-47). Active or inactive. The app adds only custom spots, each approved by an admin (D-43); city stations come only from the import pipeline (D-34). A spot has its own page address that a member can share (D-83), and anyone can report a problem with it (D-81).
3. **Feeding and water logs**: no photo. The volunteer picks a full or partial bowl (D-16). A log
   counts when the phone is within the proof radius of the spot and the limits pass (R-09), and then updates
   the spot's timers. Anyone at the spot can report "this spot was empty" (D-19) or "kittens seen" (shown for 14 days, R-35); the logger can cancel their own log for 10 minutes (D-79). A button opens the cat alert form (D-67).
4. **Cats and the feed**: photos of cats (each must contain one and has a required name of 1 to 40 characters, R-34), at a spot or random with a
   location tag, in an Instagram-style feed, never on the map. Others like and comment (D-44, D-45); an author can remove their own photo or comment (D-80).
5. **Cat alerts**: a sick cat, a cat in danger or, not urgent, a cat that needs spaying or neutering (D-64), with a photo and a
   note, tagged from where the member stands. On the map for 6 hours (7 days for spay or neuter), then in a past-alerts list every member sees for 7 days; the member who raised one, or an admin, resolves it; an admin extends it (D-41, D-42, D-84, R-24). An alert has its own page address too (D-83).
6. **Chat**: small, per spot only; cat posts have comments instead (D-48). Automatic moderation. An admin can pause a spot's chat (R-33).
7. **Profile**: at first sign-in the app asks for the full name (shown to every member, D-70), the city (the map opens there), whether to show the
   Google photo, otherwise initials, and to accept the terms and the privacy policy (D-21, D-27, D-69). Stats: cats helped, feedings, water given. Delete the account (D-71).
8. **Languages**: Hebrew (default, RTL), English, Arabic (RTL) and Russian. Every string is in a locale file per language
   (`he.json`, `en.json`, `ar.json`, `ru.json`), served from the CDN (D-32, D-85, R-19).
9. **Municipal stations**: feeding stations cities have already installed, imported from public
    sources and shown as read-only spots ([SOURCES.md](SOURCES.md), D-34).

All photos and all text (names, cat names, spot names, chat) are moderated (R-04). The profile
picture is the member's own Google photo, shown only if they choose (D-21).

## Positioning

A Facebook group or a shared spreadsheet can list feeding spots, but it cannot prove a log is
real. Silent Whisker's logs only count when the volunteer's phone is physically within the proof
radius of the spot and the rate limits pass (R-09, D-16, D-18), so the "needs food/water" map
layer (D-14, D-17) reflects verified activity, not self-reported claims. That verified-log
mechanism, not the map itself, is the thing a copycat can't fake.

## Operating Context

Volunteers use this outdoors, at the feeding spot, phone in hand, to log a feeding or water
top-up on the spot (the proof-radius check requires it, R-09). Launch region is Israel
(D-08). The product is Hebrew-first and RTL by default, with English, Arabic and Russian beside it (D-85).

## Devices

One responsive app for phone, tablet and desktop, designed mobile first. The smallest screen is 360
px wide (common Android phones); the iPhone XS (375 x 812 px) is the smallest iPhone tested.
Nothing scrolls sideways or is cut off from there up (R-18, D-30).

## First run

Sign-in comes first: a signed-out visit shows only the landing page and the sign-in button. Right after the
first sign-in, before the map: the sign-up form (name, city, photo choice and the terms checkbox, D-69), a screen
that explains how to install the app from the browser (D-01), then a short screen saying the browser is about to ask
for the phone's location, which checks that a log or an "empty" report was made at the spot (R-09, R-16) and pins cat
alerts and "my location" spots. One tap starts the browser prompt, which asks for a precise position. Refusing never
blocks the app: a log without a good enough location is saved as unverified (R-09); only a cat alert needs it (R-23). The profile
explains how to turn the permission back on. Nothing else needs a permission: logs have no photo
(D-18), and photos come from the phone's own picker, which has no browser prompt.
No notification permission in v1 (D-12, D-66). See D-31.

## Location privacy

Every spot and cat alert is shown at its exact point. City stations (cities publish them) and cat alerts (helpers must find the cat) show to every member. A custom spot,
often by a home, shows only to a member within 150 m, or while it needs food or water, or to its creator and admins (R-03, D-47). A member's own phone
location is used for that check and for the proof radius (R-09, R-16) and is not stored; only a log's distance, rounded to 10 m, is kept. A cat alert's pin and a
"my location" spot are the phone's location at submit, kept exact; a random cat photo keeps only its neighbourhood (R-28).

## Money

Cost target: free for the first 6 months, then a few dollars a month at most (D-15, D-22,
[AWS.md](AWS.md#costs)). Moderation is pay per call, so layered limits bound it (R-05). Income: a
donation link to a hosted page, and ads only on the public landing page (AdSense cannot see pages
behind sign-in without a crawler login, D-39), with a consent banner for EU visitors. No payment
code in this repo.

## Non-goals for v1

Push notifications (planned for after v1, D-66, D-86). Phone or Apple login. A native app. A separate admin site. Payments. Offline
mode. Live (realtime) updates. A public map for signed-out visitors. Changing the profile picture in the app
(v2). Vets, volunteering events and adoption events on the map (after v1, D-46).

## UI and UX design

Code first, no Figma (D-40). The tool is Impeccable (`.claude/skills/impeccable`).

1. Done (D-55): `/impeccable shape` for every area, in `design/briefs/`; mocks of every screen in
   `design/mocks/` (run `node design/serve.mjs`); open questions in `design/briefs/10-open-questions.md`.
2. The look is in [DESIGN.md](DESIGN.md) (D-56). The owner approves the whole design before Phase 2.
3. A phase builds only its own screens from the design; to change one, update the design first.
4. Before each PR with screens, run `critique`, `audit` and `polish`.

## Build order

One phase, one PR or smaller. Finish a phase before the next. Inside a phase, build the backend (endpoints and tables) before the screens that use it.

0. Repo and harness: `npm run verify` green, CI, Stop hook. **Done.**
1. AWS infra and deploy pipeline in Stockholm (Terraform, GitHub deploy key, the text and photo tests D-49 and
   D-50, AWS Budget of $10 a month, cost limits, D-52). CloudFront serves the app and `/locales/`
   (D-38, D-49). **Done** (live since 2026-10-21; the Budget was made by hand, not in Terraform).
2. Design of every screen, approved (UI and UX design, `DESIGN.md`), then Google sign-in, the sign-up form and profile,
   the public landing and legal pages, the four-language shell, responsive shell. Sign-in is required
   (D-39), so it comes before the map. **Under way.**
3. Map and spots (exact; custom spots per D-47), municipal stations loaded into `spots`, custom spots
   (a separate form, admin approval, D-43), the spots list (D-82), the admin list in Profile (D-78), moderated photo upload.
4. Feeding and water logs (no photo), the first-run location screen and the "needs food/water"
   layer; municipal stations become loggable (D-35). Proposed: when several members dispute one
   member's logs, an admin gets a flag and that member's next logs need a photo.
5. Cats, the feed, likes, comments, chat.
6. Cat alerts, stats, landing-page ads, donation link, launch checklist (privacy policy, terms, Hebrew text moderation test).
7. Automated testing of the whole app, frontend and backend (D-89): every scenario of [TESTING.md](TESTING.md) becomes a test, written from the specs, plus browser journeys, mutation checks and a deployed smoke test.

## Evidence on Hand

Repo art (cat-pin logo, README images) lives in `.github/assets/`. It is not the app's design system, which is [DESIGN.md](DESIGN.md). No reference apps yet; do not invent any.

## Product Principles

1. Privacy by default: a custom spot reaches only members near it, or while it needs help (D-47);
   phone coordinates are not stored except as a cat alert's pin or a "my location" spot; and
   signed-out people get no map at all, just the sign-in screen (D-39).
2. Every rule is enforced server-side; a client-only check is not an implemented rule.
3. Trust through verification: a counted log proves the volunteer was physically at the spot,
   rather than relying on self-reported claims.
4. Cost-bounded by design: every metered call runs through per-member limits and a daily circuit breaker, so growth in usage can
   never produce a surprise bill.
5. Hebrew and Israel first: RTL and Hebrew text moderation are launch requirements, not a later
   localisation pass. Writing inside a photo is checked in English only (D-50).
