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
| D-14 | Thresholds for "needs food" and "needs water" (hours). Food: 24 h since the last counted feeding log if it was a full bowl, 12 h if partial (accepted, see D-16). One highlight level per type, no "due soon" stage; the early morning and late evening routine is guidance text only (accepted). Water, never-logged spots and per-spot overrides: open. | open |
| D-15 | Cost figures and the CloudFront free allowance were taken from search results, not the AWS pages. Re-check before Phase 1. | open |
| D-16 | Feeding logs record the amount fed, chosen by the volunteer: full bowl (keeps the spot fed 24 h) or partial (12 h). Self-reported: the R-09 photo checks cannot judge quantity. | accepted |
