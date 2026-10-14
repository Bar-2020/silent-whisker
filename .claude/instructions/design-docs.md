## Design docs

**`docs/` is the source of truth.** Six short files, each capped at 150 lines (a test enforces it):

| File | What it holds |
|---|---|
| [docs/PRODUCT.md](../../docs/PRODUCT.md) | What the app is, v1 scope, non-goals, money |
| [docs/RULES.md](../../docs/RULES.md) | The `R-nn` rules and where each is enforced |
| [docs/DATA.md](../../docs/DATA.md) | Tables and the queries they serve |
| [docs/API.md](../../docs/API.md) | Endpoint table, static CDN files |
| [docs/SOURCES.md](../../docs/SOURCES.md) | Where municipal feeding stations come from and how they are imported |
| [docs/DECISIONS.md](../../docs/DECISIONS.md) | The `D-nn` log: accepted, proposed, open |
| [docs/AWS.md](../../docs/AWS.md) | AWS regions, prices and free-tier facts, with sources and dates |

Read PRODUCT and RULES first, then only the file your task touches. If you edit a spec, keep it
short: cut before you add.
