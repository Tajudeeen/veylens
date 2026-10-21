# Security policy

## Report a vulnerability privately

Use [GitHub's private vulnerability report](https://github.com/Tajudeeen/veylens/security/advisories/new) when that option is enabled. If it is unavailable, open an issue titled "Request for private security contact" without exploit details, identifiers, evidence files or secrets. The maintainer will arrange a private channel before collecting the report. A private repository issue is visible to its collaborators, so it is not a confidential disclosure channel by itself.

Include the affected version/commit, a minimal synthetic reproduction, expected and actual behavior, and the impact you can demonstrate. Share sensitive evidence only through the agreed channel. Never include a spending key, viewing key, wallet seed, collector key, access token or unredacted user case.

The maintainer aims to acknowledge reports within seven days. This is a volunteer project, with no response-time guarantee or bug bounty. Coordinate publication after a fix or an agreed disclosure date. Report compromised deployment credentials immediately to their owner and the relevant hosting provider.

## Supported versions and scope

Security fixes target the latest release on `main`. Historical report replay support does not make old deployments supported. Upgrade the application and verifier together, retaining the pinned public keys needed for old receipts.

In scope: input validation, browser rendering, source replay, signature verification, key trust, encrypted snapshots, collector access and persistent admission controls. Use local fixtures or a deployment you own. Do not test against other users, exhaust hosted budgets, move funds or request sensitive wallet material.

Receipts authenticate an observation, not source honesty. Merkle paths check membership in a supplied header, not independent consensus. Wallet exports remain assertions. No passing audit, dependency scan or signature is a privacy certification or an external security audit.

## Automated checks and hosting settings

- CI runs the dependency audit, adversarial tests, replay checks and browser checks. A weekly workflow repeats the dependency audit.
- Dependabot checks npm and GitHub Actions weekly. Its configuration is not proof that repository alerts or update permissions are enabled.
- A CodeQL workflow runs for this public repository. If the source becomes private, the owner must enable eligible GitHub Code Security and set `VEYLENS_CODEQL_ENABLED=true` before scans run. A skipped job is not a successful security scan.
- Repository administrators must separately enable available Dependabot alerts, secret scanning, push protection and private vulnerability reporting in GitHub settings. The connected GitHub App cannot change those administration settings. Private-repository availability depends on the account's plan and licence.

Keep secrets in provider secret storage. Never add them to Git, screenshots, build output, browser input, issue reports or workflow artifacts. Signing-key rotation and revocation are documented in [the operations checklist](docs/13-finish-checklist.md).
