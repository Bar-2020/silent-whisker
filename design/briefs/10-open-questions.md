# Open questions, each with a recommendation

Where a screen's spec is still "proposed" or silent, the design shows the recommendation and the
screen viewer tags it. Nothing here is decided until the owner says so. "Spec" means the files in
`docs/`.

## Look and system
- **Q1. Light theme only in v1?** Outdoors in glare a light screen reads best; dusk use is served
  by contrast. *Recommend: light only; the tokens are custom properties, so a dark theme can be
  added later without redrawing screens.*
- **Q2. Fonts.** *Recommend: the phone's own system font (Segoe UI, SF, Roboto/Noto Hebrew). No
  font download, no request to a third party (privacy), nothing to load before text shows.* A
  self-hosted Hebrew face (for example Heebo) is the alternative; it adds about 80 KB and a file
  to ship.
- **Q3. Icons.** *Recommend: our own small SVG set (about 30 icons, one 2 px stroke), kept in one
  sprite.* A library such as Lucide is the alternative; it adds a dependency for icons we mostly
  draw ourselves.
- **Q4. Map tile look.** The spec proposes the public OpenStreetMap tiles. *Recommend: keep them
  and soften them with one CSS filter (less saturation, a little lighter) so markers are the
  loudest thing; move to self-hosted tiles before traffic grows, as the spec already says.*

## Navigation and admin
- **Q5. Four tabs and a "+" on the map?** Map, Cats, Alerts, Me; chat only inside a spot. "+" on
  the map opens: new spot, raise an alert. *Recommend: yes.*
- **Q6. Where do admins see what is waiting?** The spec has a route for waiting spots and a queue
  for reported content, but no screen and no route to list reports. *Recommend: an admin-only
  group at the top of Me: "waiting for approval (n)" and "reported content (n)", each a plain
  list with approve/reject or hide/keep; the reports list needs a `GET /admin/reports` route
  added to the API spec.* *Decided (2026-10-29): yes, nearest first from the phone's location, plus `GET /admin/reports` (D-78, D-81).*

## First run and landing
- **Q7. Hosted Google sign-in screen.** Cognito shows its own page between our landing and the
  app. We cannot restyle it fully. *Recommend: in Phase 2 set Cognito's logo and colour in its
  managed-login branding and check how far it goes; the landing page explains the step.*
- **Q8. Terms consent.** The spec does not say how members accept the terms. *Recommend: one
  line under the sign-in button ("By continuing you accept the terms and the privacy policy"),
  both linked, no checkbox. Owner to confirm with whoever writes the legal text.* *Decided (2026-10-29): a required checkbox on the sign-up form instead of a line, stored on the server (D-69).*
- **Q9. "Continue without location" on the location screen.** The spec says one tap starts the
  prompt and refusing never blocks. *Recommend: add a quiet second button that skips the prompt;
  it leaves the permission "not asked", so the profile can still offer to ask later.*
- **Q10. Ads and the EU consent banner.** As we understand it, Google requires its own certified
  consent tool for visitors in the EU and UK before it serves ads. *Recommend: the design reserves
  one fixed-height ad slot and leaves the banner to Google's tool; verify the requirement before
  the launch phase.*
- **Q11. Where does the donation link live?** *Recommend: landing footer and the Me tab; provider
  and URL still undecided.*

## Spots and logging
- **Q12. How are members named to others?** The spec stores a full name and does not say who sees
  it. *Recommend: first name and last initial everywhere (logs, chat, comments, photos); the full
  name stays visible to admins only.* *Decided (2026-10-29): every member sees the full name (D-70).*
- **Q13. Show "you are 30 m from this spot"?** *Recommend: no. It would teach people how close
  the proof check needs them to be, and the spec says the answer shows only counted or
  unverified.*
- **Q14. A "navigate" link (Waze, Google Maps) on spots and cat alerts?** Costs nothing, reveals
  nothing a member does not already see, and is how Israeli volunteers move. *Recommend: add.* Decided for Google Maps (D-57).
- **Q15. Reason shown when a spot or photo is rejected?** The API has none. *Recommend: no
  reason, a plain "was not approved"; avoids arguments and leaks about the checks.*
- **Q16. How is a spot chosen for a cat photo?** *Recommend: a cat post starts from a spot page
  ("post a cat here") or from the Cats tab, where a short list of the nearest visible spots
  appears, plus "a cat not at a spot".*
- **Q17. Unverified logs in the spot's history?** *Decided: not shown (the owner asked to drop "not verified" from the history). Was: show, muted and labelled "not
  verified", so a volunteer who was refused can see their log was kept.*

## Cats and alerts
- **Q18. Own photo while it waits for the photo check.** *Recommend: visible only to its poster
  at the top of the feed, tagged "in review".*
- **Q19. Can a member remove their own photo or comment?** The spec has no route (status changes
  only). *Recommend: add later; not in these designs.* *Decided (2026-10-29): an author can remove their own photo, comment and chat message (D-80).*
- **Q20. A note when the feed repeats seen photos.** *Recommend: a small line at the top of the
  repeated section: "you have seen everything nearby; showing it again".*
- **Q21. Distance from the member on each alert in the list.** Computed on the phone from the
  alert's exact point. *Recommend: yes; helpers must find the cat.*
- **Q22. Alert note length.** The spec says "short, a constant". *Recommend: 140 characters.*

## Chat and profile
- **Q23. Chat order.** The API returns newest first. *Recommend: show oldest to newest with the
  composer at the bottom and an "earlier messages" button; the app reverses each page.*
- **Q24. What does "cats helped" count?** The spec stores the number and never defines it.
  *Recommend: approved cat alerts the member raised that an admin marked resolved. It is hard to
  fake and means what it says.* *Open again (2026-10-29): the member who raised an alert can now resolve it (D-84), so counting resolved alerts can be gamed. Count something else, for example alerts an admin resolved and the reporter did not.*
- **Q25. Delete my account.** Account deletion is allowed by the hard-delete exception but has no
  route or screen. *Recommend: add `DELETE /profile` and a row in Me; the design shows a confirm
  sheet.* *Decided (2026-10-29): `DELETE /profile` and a row in Profile (D-71).*
- **Q26. Where is the language switch?** *Recommend: landing page header, the Me tab, and the
  bottom of the desktop rail.* *Decided (2026-10-29): Hebrew, English, Arabic and Russian (D-85); the globe opens a list of four, never a toggle.*
- **Q27. Gendered Hebrew.** Hebrew verbs address people as male or female. *Recommend: all copy
  uses nouns, infinitives and plurals ("רישום האכלה", "לשמור"), never a "you" verb.* *Decided (2026-10-29): the same rule in Arabic and Russian.*

## Shell and access
- **Q28. Custom "install the app" banner?** *Decided: no banner; Profile has an "Install as an app" guide per browser.* *Also (2026-10-29): the onboarding has an install screen, as well as the Profile guide (D-01).*
- **Q29. A banned member.** The spec says banned members cannot write, and is silent on reading.
  *Recommend: they keep reading; every write refusal shows a plain message, and Me shows a
  permanent notice.* *Decided (2026-10-29): they keep reading, they cannot write (D-72).*
- **Q30. A list of spots for people who cannot use a map** (screen readers, keyboard only).
  *Recommend: a "spots near me" list after v1, and in v1 give markers real button semantics.* *Decided (2026-10-29): a list view of the map is in v1 (D-82).*
- **Q31. Logs at an inactive spot.** The spec says an inactive spot is never marked as needing
  help and is silent on logging. *Recommend: logs are off while a spot is inactive; its creator can
  switch it back on.*
- **Q32. The language-failed screen.** With no strings loaded it is an icon and a retry button,
  which a screen reader cannot name. *Recommend: allow one two-word built-in label in both
  languages on that one screen as a documented exception; otherwise it stays unlabelled.*
- **Q33. A Hebrew name for the app.** The mocks keep "Silent Whisker" in Latin letters in both
  languages. *Recommend: decide before launch; a Hebrew name changes the landing header only.*
- **Q34. Which side the map's "+" and locate buttons sit on in Hebrew.** *Decided by the owner: at the
  right in both languages on a phone (most hands are right hands), written with logical properties and the
  page direction; on wide screens they stay at the inline-end beside the side panel.*
- **Q35. `liquid-glass-react` sets inline styles.** The library (MIT) is the way to get the real glass
  in React, but it styles itself with the `style` attribute, which the hard rules forbid in our code.
  *Recommend: allow it as the one documented exception, in one wrapper component, and keep the CSS glass
  as the fallback.* *Decided (2026-10-29): use the library, in one wrapper component, with the CSS glass as the fallback (D-73).*
- **Q36. Map pins with colour only.** The owner asked to drop the glyph and the badge, so a pin is a
  coloured teardrop. Red, orange, green and grey differ in lightness too, but a member with colour
  blindness may still confuse green and orange. *Recommend: keep it (the card, the legend and the marker's
  name carry the words); if a colour-blind volunteer reports trouble, add a second cue such as a
  different outline shape for red.*
- **Q37. A photo on the map card.** The card shows the spot's most liked approved cat photo. The spec
  says cat photos are never on the map; this is a card, not a layer, but it needs the spot's top photo
  from the server (one more field on the spot, and an index of photos by spot, D-26). *Recommend: allow,
  loaded when the card opens (not with the pins), approved photos only, hidden when the spot is a custom
  spot the member may not see (R-03).*
- **Q38. Map search.** The owner asked for a search by city, street, house address and spot name. The
  geocoder (Nominatim, D-29) forbids autocomplete and allows 1 request a second. *Decided (2026-10-28): spots by name come
  from our own table as the member types; places are searched when they press search, cached, with the same
  limits; switch to Amazon Location Service if blocked.*
- **Q39. The admin menu in a spot chat.** A three-dots menu at the end of the top bar, for admins. *Decided (2026-10-28):
  "reported messages in this chat" and "pause the chat at this spot"; restrict and ban stay on a message's dialog.
  "Pause the chat" is new and needs the spec's say.*
- **Q40. A creator marking a spot inactive needs an admin.** The request waits in the admin list of waiting
  spots, the spot stays active meanwhile, and an admin's own change applies at once. *Decided (2026-10-28): yes.*
- **Q41. A cat photo has a required name (up to 40 characters) and an optional place.** The spec makes the name
  optional. *Decided (2026-10-28): as the owner asked; the name is the title of the post.*
- **Q42. Ended alerts stay visible to everyone for 7 days** (the spec shows them only to admins, for 24 hours),
  and an alert says "reported N hours ago", not "N hours left". *Decided (2026-10-28): yes; extending is still admin only.*
- **Q43. The map credit.** Checked 2026-10-28: OpenStreetMap's tile policy says the credit must be
  clearly on the map and not hidden behind a toggle; their attribution guidelines let it fold into an (i)
  after five seconds. *Decided: it shows in a corner when a map opens, folds into an (i) after five seconds,
  and the legend repeats it. The public tile server also needs a named User-Agent and a Referer, caching, and
  no prefetching; self-hosted tiles stay the plan (Q4). Also: with location off the feed shows the profile city.*
- **Q44. Spay or neuter alerts (D-64).** Chosen by the owner as a third alert kind. *Decided
  (2026-10-28): lasts 7 days (a constant) and an admin can extend it; the reporter or an admin can mark it handled; it
  counts toward the same daily alert limit; the photo must show a cat; the text and photo checks are the same.*
- **Accessibility target (not a question):** WCAG 2.2 AA, with 48 px touch targets and visible
  focus. Israeli web accessibility rules point to the same level.
