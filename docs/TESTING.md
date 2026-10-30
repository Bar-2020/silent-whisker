# Testing

How the app is tested, from one function to a whole journey (D-90). The cases are in the
`TESTS-*.md` files below; this file is the method. Every phase ships the tests of its own rules
([working-style.md](../.claude/instructions/working-style.md)). Phase 7 runs the whole catalogue
against the finished app, with a second pair of eyes.

| Catalogue | Holds |
|---|---|
| [TESTS-BACKEND-PEOPLE.md](TESTS-BACKEND-PEOPLE.md) | Sign-in states, profile, admin, reports, hostile input |
| [TESTS-BACKEND-PLACES.md](TESTS-BACKEND-PLACES.md) | Spots and who sees them, logs, empty and kittens reports, cat alerts, the import |
| [TESTS-BACKEND-CONTENT.md](TESTS-BACKEND-CONTENT.md) | Photos, cat posts and the feed, comments, chat, cost limits, rate limits, privacy sweeps |
| [TESTS-FRONTEND.md](TESTS-FRONTEND.md) | Shell, sign-in, languages and right-to-left, sizes, accessibility, first run, profile |
| [TESTS-FRONTEND-SCREENS.md](TESTS-FRONTEND-SCREENS.md) | Map, spot page, logging, feed, cat alerts, chat |
| [TESTS-JOURNEYS.md](TESTS-JOURNEYS.md) | Whole journeys of several members, the deployed site, infrastructure |

## Why a Phase 7 when every phase ships tests

A phase's tests are written by the session that wrote the code, from the code it just wrote, so they tend
to agree with it, mistakes included. Phase 7 is the independent pass:

1. The scenarios were written from the specs, before most of the code exists.
2. A fresh session turns each row into a test from the docs only (`RULES.md`, `API.md`, `DATA.md` and these
   files), **without reading any code**: not the handler, not the screen, not the other tests. A red scenario is a bug in the code, a gap in the spec (a `D-nn`) or a wrong
   scenario. The owner decides which, not the test.
3. Mutation testing (below) checks that the tests would notice a change.
4. Browser journeys and a deployed smoke test cover what no handler test can: a real browser, the real
   CloudFront and API Gateway.

This is a bet, so Phase 7 ends by counting the bugs it found that the phases' own tests missed, and writes the
number in `DECISIONS.md`. If it is zero, the method was not worth it and the next project skips it.

## Layers

The layer is in the second column of every row: the lowest one that can prove the case.

| L | What | How | Speed |
|---|---|---|---|
| `u` | One function, no I/O: distance, need colours (D-14), expiry sums, validators | Vitest (`npm test`) | ms |
| `i` | A handler called as a function with a real event and a real database; paid clients faked | Vitest and DynamoDB Local (proposed) | seconds |
| `c` | A screen or hook in a test DOM, the API faked | Vitest and Testing Library (proposed) | seconds |
| `e` | The built app in a real browser, against a local server running the real handlers (D-91) | Playwright (proposed) | minutes |
| `d` | The deployed site and API, read-only, with the owner's test user (D-91) | A script after each deploy | minutes |
| `m` | By hand: a native speaker's read, a real Google sign-in, a real phone | A checklist before launch | - |
| `t` | Terraform: routes, roles, tables | `npm run test:iac` (exists) | seconds |

Most backend rows are `i`. The rules (R-10, R-12, R-13, R-17, D-52) rest on **conditional writes**, and a mock
proves which call was made, not that the database refuses the second one. AWS's own serverless testing guide
says the same: mocked services do not check IAM, quotas or real behaviour, integration tests carry the weight,
and emulators are used sparingly. DynamoDB Local is the free-tier compromise; a first spike must show it refuses a
conditional write like the real service. `d` covers the deployed site, read-only (D-91).

## How a test is written

1. **Cite it.** The test names its scenario and rule: `// LOG-07, R-10`. A row with no test is a gap; a script
   lists the gaps at the end of Phase 7. A test with no row is allowed only for a pure `u` test. Ids are never renumbered or reused.
2. **Boundaries come from the constants.** Try value minus one, the value and plus one, read from
   `shared/constants/`, so a changed constant keeps the test true. Whether the limit itself is inside is D-92.
3. **Refuse as the person who should be refused** (working-style). Call the real handler as that member, then
   check the whole answer and **what was not saved** (no row, no counter moved, no object copied), not only the status.
4. **Races are tests.** Send N identical requests at once (`Promise.all`) and expect exactly the allowed number to
   pass. Every limit and every toggle has one (R-10, R-12, R-13, R-17, R-23, R-25, R-26, R-30, R-31).
5. **Time is faked and UTC.** Try each side of a boundary and of 00:00 UTC. Run the suite once under
   `TZ=Asia/Jerusalem` and once under `TZ=America/Los_Angeles`: a result that changes means local time leaked in (R-06).
6. **Outside calls are faked behind one seam.** Bedrock, the text check, Nominatim, S3 copies, SNS: the handler takes its
   clients from a module the test replaces, never a switch on the test environment (`fallow audit` fails that). A fake can
   answer wrongly: another word than CAT, nothing, a timeout, a throttle. The failure is the scenario (R-04, R-05).
7. **Never weaken a test to make it pass.** `fallow audit` already fails a skipped test, a dropped assertion and a
   suppression. A red scenario is fixed in the code, or the scenario is changed in the docs with a decision.
8. **Properties where the cases are many.** `fast-check` (proposed) for distance and the 150 m rule, rolling windows,
   expiry sums and map queries compared with a brute-force filter over random spots.
9. **One table, two sides.** The need colours and the custom spot rule run on the client and the server (D-47). One golden
   table in `shared/` runs in both, so they cannot disagree.
10. **Test data is made by the test:** new ULID members and spots per test, with Hebrew, Arabic, Russian, emoji and
    right-to-left marks in every text field. No real person, never production.

## Mutation testing

StrykerJS (proposed; a spike checks it runs under Vite+) changes the rule code: `>=` to `>`, a constant by one, a dropped
condition. A surviving mutant on a rule is a missing scenario: add the scenario, not a test aimed at the mutant. Run it on
the files a PR changes, and on everything once at the end of Phase 7. The exit score of 80% on rule code is a proposal.
Tests written by a model tend to cover the plain cases and miss the edge of a boundary, so this is the check on them.

## Agentic workflow

Four jobs, each its own session (a subagent or a fresh session), so nobody marks their own homework:

| Job | Reads | Writes | Never |
|---|---|---|---|
| Scenario author | specs, design briefs | rows here | code |
| Test writer | the docs only: these files, `RULES.md`, `API.md`, `DATA.md` | tests | any code: handlers, screens, other tests |
| Implementer | everything | code | tests (asks the owner to change a row) |
| Reviewer | the diff, these files | findings | code |

The test writer's session is started with that limit in its prompt, and it stops and reports instead of opening a
source file. If a test needs something the docs do not say (a route, an event shape, a field, a constant's name),
that is a gap in the docs: it is added to `API.md`, `DATA.md` or the row first, by the scenario author, never
read out of the code. The test writer also never sees the implementer's reasoning or notes, only the docs.

For the browser, the catalogue is the plan Playwright's planner would write, so only its generator and healer are used. The
generator writes the `e` tests from rows. The healer may change a locator or a wait and **nothing else** (it may skip a test
it thinks is broken, and a skip fails the audit here), and a person reads every healed test.

## What a test never does

Write to production: the deployed check only reads. Call a real paid model from CI (the one real-model run is
`scripts/photo-check-test.mjs`, by hand, D-50). Use a real member's Google account (the deployed check uses the owner's test
user, D-91). Send a real email (the breaker's mail is a fake). Load test the real stack: a flood can pause the project (D-38, D-22).

## The test check

Run before every PR ([pre-pr-review.md](../.claude/instructions/pre-pr-review.md)), after `/ponytail-review` and
`/code-review`. For each rule, endpoint or screen the diff touches:

1. Find its rows in the `TESTS-*.md` files and the test that cites each. A row with no test, or a rule with no row, is a finding.
2. Would the test fail if the rule broke? A status code alone, or a happy path alone, does not prove a refusal.
3. Is each limit tried at value minus one, the value and plus one, and is there a race test where two requests at the same
   moment could both pass?
4. Does a refusal test check that nothing was saved? Is the answer for a hidden spot, a refused empty report and someone
   else's item identical to the answer for a missing one?
5. Does every text field, coordinate and id get a hostile value (a right-to-left mark, markup, a huge string, another member's key)?
6. Did the diff skip, loosen or delete a test, or copy a constant's number into a test file? That is a finding unless the owner asked.
7. Does a screen change touch the four locale files, 360 px and right-to-left, and does a test open the screen there?

## Phase 7 exit

1. Every rule in `RULES.md` has a row (a test fails if not) and every row except an `m` row has a test citing its id (a script lists gaps).
2. `npm run verify` is green with no skipped test, and the suite is green under both `TZ` values.
3. The mutation score is at the proposed 80% on rule code; each survivor is answered by a new row or a written reason.
4. Every journey in `TESTS-JOURNEYS.md` is green on Chromium and WebKit, at phone and desktop sizes, in Hebrew and
   English; the shell and the log flow also in Arabic and Russian.
5. The deployed smoke test is green after a real deploy, D-91 is answered and the gaps of D-92 are decided.
6. `DECISIONS.md` says how many bugs and spec gaps the phase found.

## Sources

Read on 2026-10-29. Practitioner write-ups and a few papers, not rigorous comparisons, none of a project like this one.
[Playwright test agents](https://playwright.dev/docs/test-agents) (planner, generator, healer, seed test).
[AWS: testing Lambda and serverless applications](https://docs.aws.amazon.com/lambda/latest/dg/testing-guide.html) (cloud tests, mocks, emulators).
[CircleCI on letting an agent say it passed](https://loop.circleci.com/we-let-an-ai-agent-say-i-passed-was-it-actually-good) (agents wrote more tests when CI would check them).
[Can LLMs write good property-based tests?](https://arxiv.org/pdf/2307.04346) (properties checked with mutants).
