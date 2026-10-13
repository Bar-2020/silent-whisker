# Product

Silent Whisker is a free, open-source web app (installable PWA) where volunteers map stray-cat
feeding spots, log feedings and water with photo proof, flag cats in danger, and chat. Hebrew
first, English second. Israel first.

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
3. **Feeding and water logs**: each needs a photo as proof and updates the spot's timers (R-09).
4. **Cats**: a member photographs a known cat at a spot. Others like and comment.
5. **Alerts**: a cat in danger or sick, shown on the map until resolved.
6. **Places**: vets and organisations that help strays, as map points of interest.
7. **Chat**: small, per spot or per cat. Automatic moderation.
8. **Profile**: avatar, name, city, stats (cats helped, feedings, water given).
9. **Languages**: Hebrew (default, RTL) and English.

All photos and all text (names, cat names, spot names, chat) are moderated (R-04).

## Location privacy

Each spot stores an exact address. The public map shows only an approximate area (a circle of
about 300 m whose center is offset by a fixed random amount). Signed-in members can open the exact
address, up to a daily limit (R-03). Visitors never see it.

## Money

Cost target: uptime at about $0 inside the AWS free tier. Moderation is pay per call, so a daily
cap bounds it (R-05). Income: ads (AdSense, with a consent banner for EU visitors) and a
donation link to a hosted page. No payment code in this repo.

## Non-goals for v1

Push notifications. Phone or Apple login. A native app. A separate admin site. Payments. Offline
mode. Live (realtime) updates.

## Build order

One phase, one PR or smaller. Do not start a phase while the previous one is half built.

0. Repo and harness: `npm run verify` green, CI, Stop hook.
1. AWS infra and deploy pipeline (CDK, GitHub OIDC, budget alert, daily cap function).
2. Map and spots, read only (approximate positions, Hebrew/English shell).
3. Google sign-in, profile, create spot, moderated photo upload.
4. Feeding and water logs with photo proof, and the "needs food/water" layer.
5. Cats, likes, comments, chat.
6. Alerts, places, stats, ads, donation link, launch checklist (privacy policy, terms, Hebrew
   moderation test).
