# Zecathon 2026: evidence-first submission gate

Checked against https://thezecathon.com/ on 2026-10-25. This is the **Zcash privacy Zecathon hosted by zkSNARKS**, not the Zenith Bank competition or a ZecHub hackathon.

## Public host requirements confirmed

- Submission deadline: **2026-10-28 23:59 UTC**.
- Five tracks and a $100,000 combined prize pool.
- Registration and submission use a host account (GitHub, Google or email).
- The host says submissions remain sealed until judging opens.
- Judging starts October 29; winners are scheduled for November 23.

**Not independently verified:** track names and descriptions, rubric weights, eligibility details, required form fields, video format, license requirements, project disclosure rules, and whether a particular track requires Zcash mainnet interaction. Those details appear inside the signed-in host portal. Record exact text or screenshots before selecting a track. Do not apply requirements from other events.

## Suggested project positioning

**Veylens: independently replayable privacy diagnostics for Zcash integrations.**

A developer importing a Zcash cross-chain transfer can inspect source transaction bytes, classify transparent refund relationships, compare a proposed correction, and export signed source observations plus an independently replayable report. The system distinguishes checked raw evidence, signed source observations, signed provider quote fields, wallet assertions and unknown shielded facts.

### Demonstration path for judges

1. Open https://veylens.vercel.app/workspace.html and import `examples/testnet-refund/collector-vulnerable.case.json`.
2. Inspect the identified reused public shielding-source address and transparent refund output. State explicitly that the testnet refund role is assigned by the experiment operator.
3. Export the signed report and exact case source. Open https://veylens.vercel.app/verify.html and independently replay, then intentionally alter evidence to demonstrate rejection.
4. Compare with `examples/testnet-refund/collector-corrected.case.json`. Explain why the removed finding still results in **insufficient evidence** rather than a privacy certificate.
5. Demonstrate a real historical Zcash mainnet transaction using the documented read-only endpoint, referencing the successful [GitHub Actions live smoke run](https://github.com/Tajudeeen/veylens/actions/runs/40288820275). This verifies signed collection, not a live integration refund.
6. Show the source, test commands, limitations and license. Never claim a live integration refund was proved without actual authenticated non-dry provider records.

## Submission gate

| Gate | Pass condition | Current evidence / blocker |
| --- | --- | --- |
| A: Host account | Owner can access signed-in host portal and submit | Not checked |
| B: Eligible track | Exact host track text recorded; Veylens meets it | Not checked |
| C: Public judge access | Working HTTPS pages, no sign-in, usable on mobile | Six deployed pages and API returned HTTP 200 on 2026-10-26; clean-browser and physical-phone checks still needed |
| D: Reproducible build | `npm ci && npm test && npm run build:web && npm run check:submission` passes on submission commit | Existing CI green for earlier commit; rerun all on final submission commit |
| E: Real transaction evidence | Mainnet/testnet evidence explicitly classified and replayable | Public-testnet experiment committed; real provider refund absent |
| F: Live collector | Server-side signer, budget service and source health operational | **PASS at 2026-10-26 smoke run** for signed historical mainnet/testnet collection; full-node inclusion remains unconfigured. [Run 40288820275](https://github.com/Tajudeeen/veylens/actions/runs/40288820275) |
| G: Submission materials | Title, summary, category, source/demo links, video and any exact host-required fields | Pending portal inspection and final video |
| H: Evidence safety | No wallet seed, auth token, memo or private key in exports, repo or demo | Must check before final publish |
| I: Delivery | Host acknowledges submission before 2026-10-28 23:59 UTC | Pending |

### Strict exit criteria

- Missing host category or a required submission field is **NOT VERIFIED**, not a pass.
- A read-only historical transaction is **not** proof of a cross-chain refund.
- A collector signature proves what the collector said it observed, **not** consensus.
- A locally asserted refund role is **not** provider attribution.
- No UI health flag may claim live collecting is available until a fresh deployed smoke check passes.
- Never reveal, collect or export wallet seeds, viewing keys or identifiable shielded wallet content for a demo.
- Do not merge dependency-major upgrades near submission without an isolated build, full tests and browser regression.

## Independent live-network run evidence

- [Successful GitHub Actions run 40288820275](https://github.com/Tajudeeen/veylens/actions/runs/40288820275), workflow dispatch at 2026-10-26 07:55 UTC, commit `75ec1d8d6f98ae39e10d7bee6e60dffa10ed4126`.
- Workflow job `read-only-live-verification`: checkout, `npm ci`, dependency security check, `npm run build:core`, live mainnet and testnet signed collection all succeeded.
- [Workflow definition](../.github/workflows/live-networks.yml) and [smoke implementation](../scripts/check-live-networks.mjs).
- Both transactions are existing historical records; the test neither creates new transactions nor establishes consensus, provider attribution, wallet ownership or shielded delivery.

## Demo outline (approximately 2 minutes)

**0:00-0:20:** Reveal the problem: an integration can expose a transparent refund path even while the user expects shielded privacy. Avoid claiming every transaction leaks.

**0:20-0:55:** Import the real public-testnet case. Show transaction IDs, evidence labels and detected address reuse, explaining operator-assigned refund roles.

**0:55-1:20:** Download and replay a signed report, then change a source byte and show the rejection.

**1:20-1:45:** Compare corrected case; show that reuse disappears while the verdict remains insufficient, because no shielded delivery is established.

**1:45-2:00:** Show GitHub, README, MIT license, local reproduction commands and explicit limits.

## Final release commands

```sh
npm ci
npm test
npm run build:web
npm run check:submission
npx playwright install --with-deps chromium
npm run test:browser
npm run check:deployment -- --url https://veylens.vercel.app
```

Only run `--require-node testnet` when such a node is configured. Document skipped checks and their reason.

## Final manual handoff

Before marking the submission complete, capture the signed-in portal's exact track/eligibility/submission fields, record the final demo video URL, test public navigation and import/verification on a physical phone, inspect that the sample report/source contains no credentials or sensitive wallet data, and save the submission receipt. The successful historical mainnet/testnet collector run is valid evidence of read-only collection, but not a provider refund demonstration. Check the final GitHub commit and production deployment independently.

## Outstanding priorities, in order

1. Read signed-in track/rubric/submission requirements verbatim and select the truthful category.
2. **Completed 2026-10-26:** Vercel collector signing and persistent D1 budget admission were configured without putting secrets into source.
3. **Completed 2026-10-26:** deployed read-only historical mainnet/testnet smoke verified in [run 40288820275](https://github.com/Tajudeeen/veylens/actions/runs/40288820275); independently replay the public-testnet case as a separate demo step.
4. Acquire an authentic, permissioned non-dry refund case only if available. Never manufacture attribution or make financial transfers just for a demonstration.
5. Complete physical-phone navigation/import/verify checks.
6. Record the demo and submit by the host deadline; keep the host receipt.

## Distinct value relative to upstream mitigation

Veylens is a **post-integration regression and evidence tool**. Address-generation fixes, such as per-swap viewing-key isolation, can prevent a future exposure; Veylens tests recorded behavior and compares regressions. It does not replace wallet protections or prove universal transaction unlinkability.
