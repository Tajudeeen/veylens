# Veylens 0.7: live collection and local inspection

Production has no sample-data imports. `/demo.html` retains labelled reproducibility
examples. The workspace starts empty, collects actual source responses, and never
substitutes a fixture when a source fails.

The same-origin Worker exposes fixed 1Click status and mainnet ZecBlock raw
transaction endpoints. Zcash lookup resolves at most 19 previous transactions.
Identifiers are disclosed only after the user selects the disclosure checkbox.
Imported JSON, wallet exports and address inspection remain local. Source responses
have bounded sizes, deadlines and no-store headers. User input cannot choose an
upstream URL or an RPC method. No inputs or credentials are logged by application code.

Optional runtime configuration:
- `ONECLICK_API_KEY`: server-only bearer credential if required by the provider.
- `ZEBRA_RPC_URL`: operator-controlled read-only RPC endpoint.
- `ZEBRA_NETWORK`: mandatory `mainnet` or `testnet` for the configured node.
- `ZEBRA_RPC_AUTH`: server-only Authorization header if needed.

Without a configured node, mainnet uses the public explorer and testnet lookup fails
explicitly. No node is provisioned by this release. Retrieved bytes are checked
locally against IDs. Neither explorer lookup nor a node response proves consensus,
wallet ownership or provider refund attribution. Offline source replay authenticates
content consistency, not collection origin. Transaction roles must be supplied in
the editor and remain assertions.

Revision-0 Unified Addresses use Bech32m, inverse F4Jumble, canonical typed item
parsing and network-specific padding. All 60 upstream address vectors pass. Sapling
and transparent encodings are also recognized. Shielded curve-point validity and
actual receiver selection are not proved. Unknown receiver types remain explicit.

The local z_viewtransaction inspector validates supported pool labels and summarizes
wallet-reported counts without including memos or addresses. It is not a decrypted
transaction verifier and does not add wallet assertions to signed audit conclusions.

Risk findings and evidence gaps are displayed independently. Full signed reports
retain their source replay workflow. Redacted summaries export only rule version,
severity counts, coverage and an explicit non-proof notice. They contain no IDs,
addresses, amounts, timestamps, raw evidence or inherited signature.

Remaining product gaps: independently authenticated collector receipts, canonical
chain anchoring, authenticated wallet context, supported refund attribution, and
broader on-chain timing/amount analysis. No privacy certification is claimed.
