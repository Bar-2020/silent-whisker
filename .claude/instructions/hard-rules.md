### Hard rules, no exceptions
- **Server enforces every rule.** Auth, privacy, moderation, caps, bans: all in Lambda or IAM.
  Client checks are UX, never enforcement. A rule that only exists in the client is not implemented.
- **Every user-facing string goes through `t('key')`.** No hardcoded strings, not even placeholders.
- **RTL-safe styles.** CSS logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`), never `left`/`right`. Hebrew is the primary language.
- **All timestamps stored in UTC.** Convert at display time only.
- **No hard deletes of user content.** Status changes only. Exceptions: account deletion, and
  quarantined uploads that moderation rejected (an S3 lifecycle rule expires them).
- **TypeScript strict.** No `any`, no `@ts-ignore` to get past a real type error.
- **Constants live in `src/constants/`** (limits, thresholds, caps). Never inline the numbers.
- **Nothing user-supplied is public until moderation approves it.** Photos and text. If the
  moderation call fails, the content stays hidden.
- **Exact coordinates and addresses never leave the server** except to a signed-in member, within
  the daily lookup limit (R-03).
- **Every metered AWS call goes through one function that checks the daily cap** (R-05).
