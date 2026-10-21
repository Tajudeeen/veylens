# Run your first audit

You can reproduce the committed public-testnet result without a wallet, API key, node or live collection request. The example is an operator-controlled experiment, not a captured NEAR Intents refund.

## In the browser

1. Open the [Vercel workspace](https://veylens.vercel.app/workspace). No sign-in or external keys are required for this local-import walkthrough. Live collection has separate pending server configuration, recorded in [the deployment guide](15-vercel-deployment.md).
2. Download `examples/testnet-refund/collector-vulnerable.case.json` from this repository. Import that original case into Workspace and run the review.
3. Inspect `public-source-address-reuse-in-supplied-transactions` and the exact transparent refund output. The raw transactions and receipts are checked locally.
4. Use Open report in verifier. Integrity verification and source replay should both succeed. For a portable check, export the signed report and original source and import both in Verify.
5. In Compare, use `collector-vulnerable.case.json` as baseline and `collector-corrected.case.json` as current. Reuse disappears. The corrected case still has insufficient evidence for complete privacy.

For an immediate UI tour, [Demo lab](https://veylens.vercel.app/demo) uses labelled declared examples. These are separate from the mined public-testnet experiment and the empty live workspace.

## From a terminal

Use Node.js 24 from the repository root:

```sh
npm ci
npm run build
node dist/src/cli.js audit examples/testnet-refund/collector-vulnerable.case.json
```

The vulnerable audit is expected to exit **1**, because it finds a high-severity relationship. That exit status is the result, not a failed installation. It writes a signed report and prints its filename. The imported case file is the original source. Use the printed report path with `verify` and `verify-input`:

```sh
node dist/src/cli.js verify path/to/printed.signed-report.json
node dist/src/cli.js verify-input examples/testnet-refund/collector-vulnerable.case.json path/to/printed.signed-report.json
```

To run the complete packaged regression instead:

```sh
npm run build:web
npm run check:submission
```

`check:submission` replays both committed testnet cases, checks signatures and replay, and verifies the generated pages. It does not fetch new transactions or prove a provider executed the assigned refund.

## What a successful result means

A valid receipt authenticates a collector observation. Replay reproduces the conclusion from the exported evidence. A public address-reuse finding describes the supplied transactions and declared roles. None proves wallet ownership, all historical exposure, incoming-viewing-key independence or independent chain consensus.

Live collection is a separate, explicit action. It discloses selected identifiers to the collector and its upstream source. Local import, review, encrypted saving and replay do not need it.
