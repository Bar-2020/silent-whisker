### Hard rules, no exceptions
- **Server enforces every rule.** Auth, privacy, moderation, caps, bans: all in Lambda or IAM.
  Client checks are UX, never enforcement. A rule that only exists in the client is not implemented.
- **Every user-facing string goes through `t('key')`.** No hardcoded strings, not even placeholders.
  Strings live only in `he.json` and `en.json` (same keys in both), served from the CDN, never
  bundled.
- **RTL-safe styles.** CSS logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`), never `left`/`right`. Hebrew is the primary language.
- **No inline styles.** No `style` attribute, no `element.style`. Styles live in a `.css` file beside
  the component (CSS Modules). To vary a style, switch a class or a `data-*` attribute.
- **Responsive from 360 px.** Mobile first; phone, tablet and desktop (R-18). Breakpoints are written
  once, in `frontend/src/styles/`.
- **All timestamps stored in UTC.** Convert at display time only.
- **No hard deletes of user content.** Status changes only. Exceptions: account deletion, and
  quarantined uploads that moderation rejected (an S3 lifecycle rule expires them).
- **TypeScript strict.** No `any`, no `@ts-ignore` to get past a real type error.
- **Constants live in `shared/constants/`** (limits, thresholds, caps, timeouts, sizes, counts,
  radii). No magic numbers in logic: a numeric literal other than 0, 1 or -1 is a lint error. Visual
  values (spacing, colours) live in `frontend/src/styles/`. A value Terraform also needs lives in a
  `.json` file there, which Terraform reads with `jsondecode(file(...))`.
- **Nothing user-supplied is public until moderation approves it.** Photos and text. If the
  moderation call fails, the content stays hidden.
- **A custom spot reaches a member only as R-03 allows**: phone within 150 m, the spot needing food
  or water, or its creator or an admin. Positions are exact; city stations and cat alerts go to all.
- **Every metered AWS call goes through one function**, `meteredCall` in
  `backend/shared/metered-call.ts` (a lint rule fails a file that imports a paid AWS client
  without it), that checks the global circuit breaker,
  and every paid action has a per-member daily limit (R-05, D-52). Past the breaker, content waits pending; it is never
  refused for cost (except the profile text, which is checked on the spot, D-59) and never shown before moderation passes.
- **Every endpoint is rate limited** (R-21). A new endpoint ships with its limit in
  `shared/constants/` and a test that calls it past the limit and expects a refusal; the API front door's own throttle cannot be called without a deployed API, so a Terraform test proves every route has one (D-57). Static files
  have no per-IP limit: there is no WAF for now (D-38).
