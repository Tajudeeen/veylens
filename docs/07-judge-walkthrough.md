# Veylens judge walkthrough, v0.9

The production workspace contains no sample loaders. Examples are isolated on
`/demo.html`. Arrange viewer access to the private publication before submission.

## Real public-testnet regression

1. Download `examples/testnet-refund/vulnerable.case.json` from the repository.
2. Open Workspace and use Import case evidence. The importer selects Testnet.
3. Observe High risk and `public-source-address-reuse-in-supplied-transactions`.
4. Inspect the source prevout and refund output. Both identify the same real test
   address. The refund output contains exactly 3,000,000 zatoshis.
5. Export the signed report and its source, then verify and replay them.
6. Import the vulnerable source as the comparison baseline. Import
   `examples/testnet-refund/corrected.case.json` as the current case and compare.
7. Observe removed reuse and transparent-output findings. The corrected result
   remains insufficient because shielded delivery and full privacy require more evidence.

These are mined public-testnet wallet transactions. The experiment's refund roles
are operator assertions, and it does not execute Zashi or NEAR Intents.
See [the source observations and reproduction limits](11-testnet-refund-regression.md).

## Actual mainnet collection and authenticated replay

1. Open Workspace. Select Zcash transaction and Mainnet.
2. Enter the public historical transaction ID
   `43e966e190f8a63dda0add470e9439b2163f3c89a857488b966d6af2ee716851`.
3. Read and select the identifier-disclosure checkbox. Collect and inspect.
4. Observe real retrieved raw bytes, their locally reproduced ID, previous-output
   lookup results, collector-authenticated observations, and incomplete evidence.
5. This transaction is historical inspection evidence. It is not presented as a
   refund, a shielding transaction, or a privacy leak.
6. Download the full signed report and source evidence. Open Verify report, check
   integrity, then paste the exported evidence for independent case replay.
7. Change a receipt or transaction byte in the exported evidence. Replay must fail.
   A substituted signing key cannot satisfy the pinned collector-key check.

## Review an integration's actual refund path

1. Import the original 1Click quote/status locally, or collect status using the
   integration's actual deposit address and memo. Never paste wallet keys.
2. Import raw transaction bundles or supply the shielding transaction ID.
3. For live status, Veylens collects provider-listed Zcash origin-chain hashes,
   selected transaction roles and their bounded previous outputs.
4. Automatic refund candidates require a non-dry quote with a valid provider
   signature, origin-hash membership, matching destination and exact aggregate
   refund amount. Ambiguous candidates remain unresolved. Provider reports are
   still weaker than consensus and wallet ownership evidence.
5. Optional refund overrides remain user assertions. They never become
   authenticated attribution because the user selected a role.
6. Inspect the case checkpoints, public-output findings and remedies. Missing
   shielding prevouts prevent source-reuse establishment.
7. Export source evidence and report together. Independently replay them.
8. After correcting the integration, import the original case as a baseline and
   attach the new case. Compare independently evaluated findings. An absent finding
   does not certify privacy, and evidence coverage must also be compared.

## Reproducible automated verification

```sh
npm ci
npm test
npm run build:web
node dist/src/cli.js audit your-case.json --json
node dist/src/cli.js verify path/to/report.signed-report.json
node dist/src/cli.js verify-input your-case.json path/to/report.signed-report.json
```

Exit 1 means a high finding, 3 means insufficient evidence and 2 means invalid
input. Use the report path printed by the audit.

Structural regression tests cover a risky and corrected public-address relationship
using deliberately invalid proofs/signatures. They test rule behavior and the full
UI-to-report workflow. They are not real mined transactions or a historical leak
reproduction. The full attributed real-world refund case remains evidence-dependent.

Browser interaction tests run in a simulated DOM. Actual browser/device QA remains
outstanding. A successful deployed HTTP lookup is tested separately.
