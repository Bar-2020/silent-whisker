### Hard rules, no exceptions beyond the one written in its rule
- **Server enforces every rule.** Auth, privacy, moderation, caps, bans: all in Lambda or IAM.
  Client checks are UX, never enforcement. A rule that only exists in the client is not implemented.
- **Every user-facing string goes through `t('key')`.** No hardcoded strings, not even placeholders.
  Strings live only in the locale files (same keys in all four languages), served from the CDN,
  never bundled. The one exception: the retry word of the screen shown when a locale file cannot
  load, kept in `shared/constants/languages.ts` (D-102).
- **RTL-safe styles.** CSS logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`), never `left`/`right`. Hebrew is the primary language.
- **No inline styles.** No `style` attribute, no `element.style`. Styles live in a `.css` file beside
  the component (CSS Modules). To vary a style, switch a class or a `data-*` attribute. The one
  exception is a library's own inline styles (the map, the glass navigation: D-59, D-73); our code
  still writes none.
- **Responsive from 360 px.** Mobile first; phone, tablet and desktop (R-18). Breakpoints are written
  once, in `frontend/src/styles/`.
- **All timestamps stored in UTC.** Convert at display time only.
- **No hard deletes of user content.** Status changes only. Exceptions: account deletion, and
  quarantined uploads that moderation rejected (an S3 lifecycle rule expires them).
- **TypeScript strict.** No `any`, no `@ts-ignore` to get past a real type error.
- **Everything from outside is parsed with a zod schema** (D-101): a request body, a stored row, an answer
  from another service, a Lambda's settings. No type assertion (`as`) and no hand-written checks. The
  schema is the one definition of the shape and its TypeScript type is `z.infer` of it. Schemas live in
  `shared/schemas/` when the frontend reads the shape too, otherwise in `backend/shared/schemas/`, which only
  the backend imports (the boundary check in `.fallowrc.jsonc` fails anything else). Schema
  files are named `<name>.schema.ts`. A built entity has no field list in `docs/DATA.md` (it links the schema); one not built yet has no schema.
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
  without it), that checks the global circuit breaker, and every paid action has a per-member
  daily limit (R-05, D-52). Past the breaker, content waits pending; it is never refused for
  cost (except the profile text, which is checked on the spot, D-62) and never shown before
  moderation passes.
- **Every endpoint is rate limited** (R-21). A new endpoint ships with its limit in
  `shared/constants/` and a test that calls it past the limit and expects a refusal. The API
  front door's own throttle cannot be called without a deployed API, so a Terraform test proves
  every route has one (D-60). Static files have no per-IP limit: there is no WAF for now (D-38).
