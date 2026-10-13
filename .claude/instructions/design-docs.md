## Design docs

**`docs/` is the source of truth.** Five short files, each capped at 150 lines (a test enforces it):

| File | What it holds |
|---|---|
| [docs/PRODUCT.md](../../docs/PRODUCT.md) | What the app is, v1 scope, non-goals, money |
| [docs/RULES.md](../../docs/RULES.md) | The `R-nn` rules and where each is enforced |
| [docs/DATA.md](../../docs/DATA.md) | Tables and the queries they serve |
| [docs/API.md](../../docs/API.md) | Endpoint table |
| [docs/DECISIONS.md](../../docs/DECISIONS.md) | The `D-nn` log: accepted, proposed, open |

Read PRODUCT and RULES first, then only the file your task touches. If you edit a spec, keep it
short: cut before you add.
