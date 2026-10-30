# 6. Cat alerts

Mode: Operate, with the highest stakes in the app: a hurt animal and a stressed person.

## Job and audience
A member who stands next to a sick or endangered cat raises an alert in under a minute. Other
members nearby see it and go. The member who raised it, or an admin, resolves it; an admin extends it (D-84).

## Outcome and proof
- **Raise**: choose "in danger" or "sick" (two large options) or, calmer, a full-width "spay or neuter"
  (not urgent, stays 7 days, D-64, Q44), photo (required, from the phone's
  own picker), short note (required, with a counter), location read at submit (shown as a status
  line: locating, good, too vague). Submit stays disabled until all four hold. After submit the
  alert is **in review** and is not on the map yet; the screen says so plainly and says when it
  expires (6 hours after it is raised).
- **List** (the Alerts tab): newest first, each row has the photo, kind chip, "reported N hours ago",
  the note (two lines), distance and area (computed on the phone, Q21), and two buttons side by side:
  details and show on map. "Past alerts" (7 days, everyone, Q42) is a button under the list.
- **Alert sheet on the map**: photo, kind, note, time left, report, and for admins: resolve and
  extend by 12 hours. The member who raised the alert sees "mark as handled" instead (D-84). An alert has its own page address, `/alerts/{id}`, and a share button (D-83). An ended alert is marked, visible to everyone for 7 days, and only an admin can
  extend it. On the alert's page Navigate and Show on map are on the pinned bar.

## Selected direction
The plum alert colour and the sign-on-a-stem silhouette appear only for alerts. The raise form is
the calmest screen in the app: big type, few choices, no decoration, because the person using it
is rushed.

## States and ranges
Raise: form, locating, location too vague (what to do: move to open sky, wait, try again),
location permission denied (how to turn it on), submitting, in review, no cat found in the photo,
text refused, daily limit of 5. List: 0 to 20 rows, empty ("no alerts near you; that is good
news"), expiring soon (under 1 hour), expired (admin only). Note 5 to 140 characters (Q22).

## Interaction and layout
The raise button is on the Alerts tab and in the map's "+" menu. After submit, go back to the
Alerts tab with the new item shown to its creator as "in review".

## Boundaries
No push (not in v1), so the screen never promises a notification. No link to a spot (spec). No
vets map layer and no organisations receiving alerts (after v1). Pending design change (D-99, D-100): a list of 24-hour emergency vets and hotlines with tap-to-call on the alert page, and a line in the form saying the alert may be shared with rescue organisations and city vet services, never the member's name.

## Open decisions
Q5, Q21, Q22.
