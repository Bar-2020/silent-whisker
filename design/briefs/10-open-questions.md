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
  added to the API spec.*

## First run and landing
- **Q7. Hosted Google sign-in screen.** Cognito shows its own page between our landing and the
  app. We cannot restyle it fully. *Recommend: in Phase 2 set Cognito's logo and colour in its
  managed-login branding and check how far it goes; the landing page explains the step.*
- **Q8. Terms consent.** The spec does not say how members accept the terms. *Recommend: one
  line under the sign-in button ("By continuing you accept the terms and the privacy policy"),
  both linked, no checkbox. Owner to confirm with whoever writes the legal text.*
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
  name stays visible to admins only.*
- **Q13. Show "you are 30 m from this spot"?** *Recommend: no. It would teach people how close
  the proof check needs them to be, and the spec says the answer shows only counted or
  unverified.*
- **Q14. A "navigate" link (Waze, Google Maps) on spots and cat alerts?** Costs nothing, reveals
  nothing a member does not already see, and is how Israeli volunteers move. *Recommend: add.*
- **Q15. Reason shown when a spot or photo is rejected?** The API has none. *Recommend: no
  reason, a plain "was not approved"; avoids arguments and leaks about the checks.*
- **Q16. How is a spot chosen for a cat photo?** *Recommend: a cat post starts from a spot page
  ("post a cat here") or from the Cats tab, where a short list of the nearest visible spots
  appears, plus "a cat not at a spot".*
- **Q17. Unverified logs in the spot's history?** *Recommend: show, muted and labelled "not
  verified", so a volunteer who was refused can see their log was kept.*

## Cats and alerts
- **Q18. Own photo while it waits for the photo check.** *Recommend: visible only to its poster
  at the top of the feed, tagged "in review".*
- **Q19. Can a member remove their own photo or comment?** The spec has no route (status changes
  only). *Recommend: add later; not in these designs.*
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
  fake and means what it says.*
- **Q25. Delete my account.** Account deletion is allowed by the hard-delete exception but has no
  route or screen. *Recommend: add `DELETE /me` and a row in Me; the design shows a confirm
  sheet.*
- **Q26. Where is the language switch?** *Recommend: landing page header, the Me tab, and the
  bottom of the desktop rail.*
- **Q27. Gendered Hebrew.** Hebrew verbs address people as male or female. *Recommend: all copy
  uses nouns, infinitives and plurals ("רישום האכלה", "לשמור"), never a "you" verb.*

## Shell and access
- **Q28. Custom "install the app" banner?** *Recommend: none in v1; the browser offers its own.*
- **Q29. A banned member.** The spec says banned members cannot write, and is silent on reading.
  *Recommend: they keep reading; every write refusal shows a plain message, and Me shows a
  permanent notice.*
- **Q30. A list of spots for people who cannot use a map** (screen readers, keyboard only).
  *Recommend: a "spots near me" list after v1, and in v1 give markers real button semantics.*
- **Q31. Logs at an inactive spot.** The spec says an inactive spot is never marked as needing
  help and is silent on logging. *Recommend: logs are off while a spot is inactive; its creator can
  switch it back on.*
- **Q32. The language-failed screen.** With no strings loaded it is an icon and a retry button,
  which a screen reader cannot name. *Recommend: allow one two-word built-in label in both
  languages on that one screen as a documented exception; otherwise it stays unlabelled.*
- **Q33. A Hebrew name for the app.** The mocks keep "Silent Whisker" in Latin letters in both
  languages. *Recommend: decide before launch; a Hebrew name changes the landing header only.*
- **Accessibility target (not a question):** WCAG 2.2 AA, with 48 px touch targets and visible
  focus. Israeli web accessibility rules point to the same level.
