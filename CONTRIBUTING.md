# Contributing to Veylens

Start with [the quick start](docs/14-quick-start.md) and [the evidence contract](docs/12-release-readiness.md). Veylens reviews evidence with explicit limits. A finding disappearing must not silently become a claim of complete privacy, ownership or consensus.

## Issues

For a bug, include the commit/version, operating system/browser, network, minimal synthetic input, steps to reproduce, and expected versus actual behavior. Remove addresses, transaction identifiers and wallet context unless the record is public and you intentionally want it disclosed. Use [SECURITY.md](SECURITY.md) for suspected vulnerabilities.

For a feature, explain who needs it, the concrete decision it helps them make, and what evidence would support its result. Discuss changes to cryptography, trust keys, evidence formats or privacy claims before implementing them.

## Local development

Use Node.js 24, matching CI.

```sh
npm ci
npm test
npm run build:web
npm run check:submission
npm run check:dependencies
npm run dev
```

The development server starts without runtime credentials. Local imports and the demo work without a collector key or a full node. Collection protection fails closed when it is not configured. Never add production credentials to local source files.

For browser checks in your own development environment:

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

## Pull requests

Use a focused branch. Explain the problem, resulting behavior and relevant validation. Add tests when changing evidence semantics, cryptography, trust policy, input handling or hosted admission. Keep append-only database migrations and historical replay implementations intact. Preserve existing public verification keys when rotating a signer.

Use synthetic data for new fixtures unless a public record is essential. Document its source and limits. Do not attach runtime secrets, wallet exports, generated reports containing private evidence, `.vercel` state or dependency folders.

CI runs the same core checks on pull requests. Vercel deployment configuration and the independent budget service are described in [the migration guide](docs/15-vercel-deployment.md). A browser-emulated mobile test does not establish physical-phone compatibility.

By contributing, you agree that your contribution is provided under [the MIT licence](LICENSE). Keep upstream attribution in `THIRD_PARTY_NOTICES.md` when adding third-party material.
