# 1. First run: sign-in, profile questions, location screen

Mode: Operate (short forms; the sign-in screen itself is the landing page, see area 2).

## Job and audience
A volunteer who just heard about the app from a Facebook group or a friend, phone in hand,
wants to get to the map in under a minute without handing over more than the spec asks.

## Outcome and proof
Three steps, each one screen, each skippable only where the spec says so:

1. **Sign in with Google** (button on the landing page; Cognito's hosted Google screen follows,
   which we cannot restyle fully, Q7).
2. **Profile questions** (one screen, three fields): full name (required free text), city
   (required free text, looked up by the server on submit, no autocomplete), and "show my Google
   photo?" with two choices and **no pre-selected answer**. Without a Google photo the second
   question is hidden and initials are used.
3. **Location screen** (once per device, skipped when the browser already granted it): one short
   explanation, one button that starts the browser prompt. Refusing never blocks the app.

## Selected direction
Inherit the stairwell wall. A progress hint ("1 of 2") is not needed: two screens. Large title,
one paragraph of why, form, one primary button pinned to the thumb zone.

## States and ranges
- Profile: empty, filled, field error (required), name or city refused by text moderation, city
  not found (the lookup failed), submitting, saved. City names run 2 to 40 characters in Hebrew
  or English.
- Location: not asked (default), the browser prompt open (the screen waits, nothing to draw),
  granted (go to the map), denied (go to the map with a one-line notice that points at the
  profile), already granted (screen skipped, nothing to design).

## Interaction and layout
Single column, 480 px max on wide screens, centred on the white wall. The primary button sits in
a floating glass bar at the bottom on phones, so a thumb finds it.
Inline errors under the field with an icon and words, never a toast.

## Boundaries
No notification permission (not in v1). No camera prompt. Never block on location. No marketing
on these screens.

## Open decisions
Q7 (hosted sign-in look), Q8 (terms line), Q9 ("continue without location" button).
