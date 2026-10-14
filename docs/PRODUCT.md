# Product

Silent Whisker is a free, open-source web app (installable PWA) where volunteers map stray-cat
feeding spots, log feedings and water, flag cats in danger, and chat. Hebrew first, English
second. Israel first.

## Who uses it

- **Visitor** (signed out): sees all spots on the map, at approximate positions. Cannot interact.
- **Member** (signed in with Google): everything else. Sees exact addresses within a daily limit.
- **Founder**: the member who created a spot. Can rename it and mark it inactive.
- **Admin** (later): a member with an admin flag. Bans users, restricts chat. No separate admin
  screens: the actions are buttons in the normal screens, shown only to admins.

## v1 scope

1. **Map** (Leaflet + OpenStreetMap). All feeding spots. Spots that most need food or water are
   highlighted, based on time since the last counted log and whether the spot is active.
2. **Spot**: name (founder's, or generated from the street), photo, exact address, approximate
   area on the public map. Active or inactive.
3. **Feeding and water logs**: no photo. The volunteer picks a full or partial bowl (D-16). A log
   counts when the phone is within the proof radius of the spot and the limits pass (R-09), and then updates
   the spot's timers. Anyone at the spot can report "this spot was empty" (D-19).
4. **Cats**: a member photographs a known cat at a spot. Others like and comment.
5. **Alerts**: a cat in danger or sick, shown on the map until resolved.
6. **Places**: vets and organisations that help strays, as map points of interest.
7. **Chat**: small, per spot or per cat. Automatic moderation.
8. **Profile**: at first sign-in the app asks for the full name, the city (the map opens there) and whether to show the
   Google photo, otherwise initials (D-21, D-27). Stats: cats helped, feedings, water given.
9. **Languages**: Hebrew (default, RTL) and English. Every string is in `he.json` and `en.json`,
   served from the CDN (D-32, R-19).
10. **Municipal stations**: feeding stations cities have already installed, imported from public
    sources and shown as read-only spots ([SOURCES.md](SOURCES.md), D-34).

All photos and all text (names, cat names, spot names, chat) are moderated (R-04). The profile
picture is the member's own Google photo, shown only if they choose (D-21).

## Devices

One responsive app for phone, tablet and desktop, designed mobile first. The smallest screen is 360
px wide (common Android phones); the iPhone XS (375 x 812 px) is the smallest iPhone tested.
Nothing scrolls sideways or is cut off from there up (R-18, D-30).

## First run

On the first load, before the map, one short screen says the browser is about to ask for the phone's
location, which checks that a log or an "empty" report was made at the spot (R-09, R-16) and so keeps
the map accurate. One tap starts the browser prompt, which asks for a precise position. Refusing never
blocks the app: a log without a good enough location is saved as unverified (R-09). The profile
explains how to turn the permission back on. Nothing else needs a permission: logs have no photo
(D-18), and photos for spots and cats come from the phone's own picker, which has no browser prompt.
No notification permission in v1 (D-12). See D-31.

## Hosting and domain

No domain is bought at the start: the app runs on its CloudFront address. Buy one before public
launch (D-36).

## Location privacy

Each spot stores an exact address. The public map shows only an approximate area (a circle of
about 300 m whose center is offset by a fixed random amount). Signed-in members can open the exact
address, up to a daily limit (R-03). Visitors never see it. A member's own phone location is used
for the proof radius checks (R-09, R-16); only the distance, rounded to 10 m, is kept.

## Money

Cost target: free for the first 6 months, then a few dollars a month at most (D-15, D-22,
[AWS.md](AWS.md#costs)). Moderation is pay per call, so a daily cap bounds it (R-05). Income: ads
(AdSense, with a consent banner for EU visitors) and a donation link to a hosted page. No payment
code in this repo.

## Non-goals for v1

Push notifications. Phone or Apple login. A native app. A separate admin site. Payments. Offline
mode. Live (realtime) updates. Changing the profile picture in the app (v2).

## Build order

One phase, one PR or smaller. Do not start a phase while the previous one is half built.

0. Repo and harness: `npm run verify` green, CI, Stop hook.
1. AWS infra and deploy pipeline (CDK, GitHub OIDC, region test D-13, AWS Budget of $20 a month,
   daily cap function). The CDN serves the app, `/locales/` and `/data/`.
2. Map and spots, read only (approximate positions, Hebrew/English shell, responsive shell, first-run
   screen, municipal stations layer from the static GeoJSON).
3. Google sign-in, profile, create spot (proposed: its pin starts from the founder's phone
   location), moderated photo upload.
4. Feeding and water logs (no photo) and the "needs food/water" layer; municipal stations become
   loggable (D-35). Proposed: when several members dispute one member's logs, an admin gets a flag
   and that member's next logs need a photo.
5. Cats, likes, comments, chat.
6. Alerts, places, stats, ads, donation link, launch checklist (privacy policy, terms, Hebrew
   moderation test).
