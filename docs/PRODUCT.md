# Product

<!-- impeccable:product-schema 1 -->

Silent Whisker is a free, open-source web app (installable PWA) where volunteers map stray-cat
feeding spots, log feedings and water, flag cats in danger, and chat. Hebrew first, English
second. Israel first.

## Platform

web

## Stack

React, Vite, TypeScript, react-leaflet, react-i18next. AWS: S3 + CloudFront, Lambda, DynamoDB,
Cognito. CDK in TypeScript, deployed from GitHub Actions with OIDC (D-02).

## Who uses it

- **Member** (signed in with Google): everyone who uses the app. Sees the map at approximate
  positions, and exact addresses within a daily limit. Signed-out people see only a landing page,
  the privacy policy and the terms (D-39).
- **Founder**: the member who created a spot. Can rename it and mark it inactive.
- **Admin**: a member with an admin flag. Approves custom spots, bans users, restricts chat, resolves or extends
  cat alerts. No separate admin screens: the actions are buttons in the normal screens, shown only to admins.

## v1 scope

1. **Map** (Leaflet + OpenStreetMap). All feeding spots. Spots that most need food or water are
   highlighted, based on time since the last counted log and whether the spot is active. The map
   shows only spots (official and custom), cat alerts and, after v1, vets and events. Never cat photos (D-45, D-46).
2. **Spot**: name (founder's, or generated from the street), photo, exact address, approximate
   area on the map. Active or inactive. Any member can add a custom spot with a separate form (food,
   water or both; a typed address or "my location"); others see it once an admin approves (D-43, R-27).
3. **Feeding and water logs**: no photo. The volunteer picks a full or partial bowl (D-16). A log
   counts when the phone is within the proof radius of the spot and the limits pass (R-09), and then updates
   the spot's timers. Anyone at the spot can report "this spot was empty" (D-19).
4. **Cats and the feed**: a member posts a cat photo, either at a spot or of a random cat with a
   location tag; it must contain a cat. Photos are not on the map: they show in a feed of recent
   photos close by that scrolls on like Instagram (photos you have not seen come first, most liked
   first), which includes the cats at feeding and water spots. Members
   like a photo (once each) and comment. Photos and comments are moderated (R-04, D-44, D-45).
5. **Cat alerts**: a member tags a sick cat or a cat in danger from where they stand, with a photo
   of the cat and a note (both required). It shows on the map and in a list for 6 hours; only an
   admin can resolve it sooner or extend it by 12 hours, any number of times (D-41, D-42).
6. **Chat**: small, per spot or per cat. Automatic moderation.
7. **Profile**: at first sign-in the app asks for the full name, the city (the map opens there) and whether to show the
   Google photo, otherwise initials (D-21, D-27). Stats: cats helped, feedings, water given.
8. **Languages**: Hebrew (default, RTL) and English. Every string is in `he.json` and `en.json`,
   served from the CDN (D-32, R-19).
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
(D-08). The product is Hebrew-first and RTL by default, with English as the secondary language.

## Devices

One responsive app for phone, tablet and desktop, designed mobile first. The smallest screen is 360
px wide (common Android phones); the iPhone XS (375 x 812 px) is the smallest iPhone tested.
Nothing scrolls sideways or is cut off from there up (R-18, D-30).

## First run

Sign-in comes first: a signed-out visit shows only the landing page and the sign-in button.
Right after the first sign-in, before the map, one short screen says the browser is about to ask
for the phone's location, which checks that a log or an "empty" report was made at the spot
(R-09, R-16), pins a cat alert, and can pin a custom spot ("my location") or a random cat photo, and
so keeps the map accurate. One tap starts the browser prompt, which asks for a precise position. Refusing never
blocks the app: a log without a good enough location is saved as unverified (R-09), a spot can be
placed by a typed address, a random cat photo falls back to the profile city, and only a cat alert needs the location (R-23). The profile
explains how to turn the permission back on. Nothing else needs a permission: logs have no photo
(D-18), and photos for spots and cats come from the phone's own picker, which has no browser prompt.
No notification permission in v1 (D-12). See D-31.

## Location privacy

Each spot stores an exact address. The map shows only an approximate area (a circle of
about 300 m whose center is offset by a fixed random amount). Signed-in members can open the exact
address, up to a daily limit (R-03). A member's own phone location is used
for the proof radius checks (R-09, R-16); only the distance, rounded to 10 m, is kept. The one
exception is a position the member creates with "my location": a custom spot, a cat alert or a
random cat photo. The phone's position is kept like a spot's exact position and shown approximately,
or for a cat photo only as a place tag (D-42, R-28).

## Money

Cost target: free for the first 6 months, then a few dollars a month at most (D-15, D-22,
[AWS.md](AWS.md#costs)). Moderation is pay per call, so a daily cap bounds it (R-05). Income: a
donation link to a hosted page, and ads only on the public landing page (AdSense cannot see pages
behind sign-in without a crawler login, D-39), with a consent banner for EU visitors. No payment
code in this repo.

## Non-goals for v1

Push notifications. Phone or Apple login. A native app. A separate admin site. Payments. Offline
mode. Live (realtime) updates. A public map for signed-out visitors. Changing the profile picture in the app
(v2). Vets, volunteering events and adoption events on the map (after v1, D-46).

## Build order

One phase, one PR or smaller. Do not start a phase while the previous one is half built.

0. Repo and harness: `npm run verify` green, CI, Stop hook.
1. AWS infra and deploy pipeline (CDK, GitHub OIDC, region test D-13, AWS Budget of $20 a month,
   daily cap function). The CDN, on the CloudFront Free plan with IP rate limiting (D-38), serves the
   app and `/locales/`.
2. Google sign-in and profile, the public landing and legal pages, Hebrew/English shell,
   responsive shell. Sign-in is required (D-39), so it comes before the map.
3. Map and spots (approximate positions), municipal stations loaded into `spots`, custom spots
   (proposed: a separate form, admin approval, D-43), the admin approval buttons, moderated photo upload.
4. Feeding and water logs (no photo), the first-run location screen and the "needs food/water"
   layer; municipal stations become loggable (D-35). Proposed: when several members dispute one
   member's logs, an admin gets a flag and that member's next logs need a photo.
5. Cats, the feed, likes, comments, chat.
6. Cat alerts, stats, landing-page ads, donation link, launch checklist (privacy policy, terms, Hebrew moderation test).

## Evidence on Hand

No logo, visual brand assets, or reference apps on hand yet (blank slate, confirmed). Future
visual work should not invent or assume any of these exist.

## Product Principles

1. Privacy by default: exact locations and raw phone coordinates never leave the server except to
   a signed-in member within the daily limit; other members get an approximate area only, and
   signed-out people get no map at all, just the sign-in screen (D-39).
2. Every rule is enforced server-side; a client-only check is not an implemented rule.
3. Trust through verification: a counted log proves the volunteer was physically at the spot,
   rather than relying on self-reported claims.
4. Cost-bounded by design: every metered call runs through a daily cap, so growth in usage can
   never produce a surprise bill.
5. Hebrew and Israel first: RTL and Hebrew moderation are launch requirements, not a later
   localisation pass.
