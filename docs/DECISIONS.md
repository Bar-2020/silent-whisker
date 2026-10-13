# Decisions

Status: **accepted** (the user said so), **assumed** (my default, confirm), **proposed**, **open**.
Missing decision mid-phase: add the next free `D-nn` with a recommendation, then ask.

| ID | Decision | Status |
|---|---|---|
| D-01 | Web first: installable PWA. Capacitor can wrap it for the stores later. | proposed |
| D-02 | Stack: React, Vite, TypeScript, react-leaflet, react-i18next. AWS: S3 + CloudFront, Lambda, DynamoDB, Cognito. CDK in TypeScript, deployed from GitHub Actions with OIDC (no stored keys). | proposed |
| D-03 | License: MIT. | accepted |
| D-04 | Sign-in: Google only at launch. Phone (SMS or WhatsApp) and Apple later, if cost and demand justify it. SMS needs a per-number, per-IP and daily cap. | accepted |
| D-05 | Visitors see all spots, approximate only. Only members interact. | accepted |
| D-06 | Exact address: signed-in members, 30 lookups a day. Upgrade path: reveal only after "I'm heading there". | assumed |
| D-07 | Admins: stored fields and server checks in v1, admin actions as buttons in normal screens, no separate admin site. | accepted |
| D-08 | Launch region: Israel. | accepted |
| D-09 | Photos: Rekognition (moderation, labels). Text: Bedrock Guardrails Standard tier (Hebrew is "supported", not tuned). Run about 50 real Hebrew messages through it before launch. | proposed |
| D-10 | Map tiles: OSM public tiles at launch (light use only, proper Referer and User-Agent, no bulk or offline download), URL in one constant. Move to self-hosted tiles on S3 + CloudFront before traffic grows. | proposed |
| D-11 | Donations: a link to a hosted page (Ko-fi, Buy Me a Coffee, PayPal). No payment code. | proposed |
| D-12 | No push notifications in v1. Alerts show on the map and in a list. | proposed |
| D-13 | AWS region: pick in Phase 1, where Rekognition and Bedrock Guardrails are both available. | open |
| D-14 | Thresholds for "needs food" and "needs water" (hours). Food: 24 h since the last counted feeding log if it was a full bowl, 12 h if partial (accepted, see D-16). Highlight levels: three colours per type, each with an icon or label as well as the colour (accepted): green inside the window, orange from 75% of it (18 h for a full bowl or water, 9 h for partial), red once it expires; the early morning and late evening routine is guidance text only (accepted). Water: 24 h since the last counted water log, flat, no amount level (accepted). A type with no counted log (unverified logs do not count) is red once the spot has any data (a counted log of either type, or a recorded cat: approved cats only, R-04, from Phase 5) and grey with a "no data" icon only when the spot has no data at all (accepted). No per-spot overrides: the same windows apply to every spot (accepted). | accepted |
| D-15 | Cost figures and the CloudFront free allowance were taken from search results, not the AWS pages. Re-check before Phase 1. | open |
| D-16 | Feeding logs record the amount fed, chosen by the volunteer: full bowl (keeps the spot fed 24 h) or partial (12 h). Self-reported: the R-09 photo checks cannot judge quantity. | accepted |
| D-17 | One marker per spot, coloured by the worse of its food and water states (red, then orange, then green; grey only when the spot has no data at all, see D-14), so a spot just fed but never watered is red. The marker shows the icon of the type driving the colour (both when tied). The spot screen shows both states separately. | accepted |
