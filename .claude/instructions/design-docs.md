## Design docs

**`docs/` is the source of truth.** Short files, each capped at 150 lines (a test enforces it; `DESIGN.md` is exempt):

| File | What it holds |
|---|---|
| [docs/PRODUCT.md](../../docs/PRODUCT.md) | What the app is, v1 scope, non-goals, money |
| [docs/RULES.md](../../docs/RULES.md) | The `R-nn` rules and where each is enforced |
| [docs/DATA.md](../../docs/DATA.md) | Tables and the queries they serve |
| [docs/API.md](../../docs/API.md) | Endpoint table, static CDN files |
| [docs/SOURCES.md](../../docs/SOURCES.md) | Where municipal feeding stations come from and how they are imported |
| [docs/DECISIONS.md](../../docs/DECISIONS.md) | The `D-nn` log: accepted, proposed, open |
| [docs/DESIGN.md](../../docs/DESIGN.md) | The look: colours, type, shapes, components. Exempt from the 150-line cap. Mocks in `design/` |
| [docs/AWS.md](../../docs/AWS.md) | AWS regions, prices and free-tier facts, with sources and dates |
| [docs/TESTING.md](../../docs/TESTING.md) | How the app is tested (Phase 7), the test check for reviews, and the list of `docs/TESTS-*.md` files: every scenario with an id, a layer and the rule it proves |

Read PRODUCT and RULES first, then only the file your task touches. If you edit a spec, keep it
short: cut before you add.
