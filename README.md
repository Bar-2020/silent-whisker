# Silent Whisker

A free, open-source map of stray-cat feeding spots, built by volunteers. Log a feeding or fresh
water with a photo, flag a cat in danger, find the spots that need help most. Hebrew first,
English second.

Status: early. Phase 0 (harness) only. See [docs/PRODUCT.md](docs/PRODUCT.md) for scope and build
order.

## Develop

```
npm ci
npm run verify   # typecheck, lint, tests, fallow audit
```

Development is spec driven: [docs/](docs/PRODUCT.md) is the source of truth and
[CLAUDE.md](CLAUDE.md) holds the rules.

## Contributing

Every PR runs `npm run verify` in CI. The automatic Claude review (`[R1]`, `[R2]`, ... findings,
checked against CLAUDE.md) is currently disabled. See [.github/workflows/ci.yml](.github/workflows/ci.yml)
and [.github/claude-review-prompt.md](.github/claude-review-prompt.md).

## License

[MIT](LICENSE)
