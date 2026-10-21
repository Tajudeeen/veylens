# Review claims and evidence

This records the boundaries used when acting on the October 21, 2026 repository review. A repository review is useful feedback, not an independent security audit or evidence that every deployment feature is configured.

| Review claim | Supported statement |
| --- | --- |
| Signed receipts prove provenance | Receipts authenticate a pinned collector's observation of exact bytes and bindings. They do not establish source honesty, canonical consensus or provider execution. |
| Merkle inclusion proves the transaction is on mainnet | The verifier checks a path against a supplied serialized header. Full-node observation and independent consensus validation are separate. No full node is currently configured in the existing deployment. |
| Veylens measures the extent of the NEAR privacy leak | The build detects relationships in supplied case records. It has no ecosystem-wide crawler, population denominator or validated exposure-volume study. |
| Different shielded addresses prove different viewing keys | Public addresses alone do not establish incoming-viewing-key independence. The current build does not verify a wallet's one-time-key derivation or recovery behavior. |
| Veylens verifies the Zakura fix works | That requires a separate integration, test vectors and wallet-level evidence. It is a possible future use, not a completed capability. |
| MIT and private source mean public auditability | The repository declares MIT and now includes the actual licence. Its current private access still limits independent review and contribution. |
| Missing governance files | SECURITY.md and CONTRIBUTING.md have been added, with a concrete disclosure path, reproduction steps and evidence requirements. |
| No direct demo link | The README already linked the hosted Demo lab. A concise quick start now distinguishes that demo from the mined public-testnet experiment. |
| CodeQL and secret scanning are enabled | Configuration files do not enable paid/private GitHub services. The workflow documents its licence gate. Repository-level settings require administrator access. |
| Mainnet use is required by the competition | Recheck the actual current event's official rules. Meaningful Zcash interaction and a mandatory mainnet-only demonstration are different requirements. No grade establishes eligibility. |

The published $600M–$700M figure is reported route volume, not a measurement produced by Veylens or a demonstrated amount stolen or deanonymized. Do not turn it into an exposure estimate without a reproducible dataset and clear assumptions.

As checked on October 21, 2026, Zakura's [one-time IVK README](https://github.com/zakura-core/wallet-libraries/blob/main/zakura/one-time-ivk/README.md) describes a draft derivation and refund-memo convention that still needs cryptographic review before live addresses. Its code availability is not proof of wallet rollout. Veylens does not generate those keys or recommend issuing live addresses from that draft.

The defensible submission claim is: Veylens helps integration developers inspect refund-path evidence, detect public address reuse, and independently replay their findings. Its committed regression uses actual mined public-testnet transactions with operator-assigned roles. Actual provider refund attribution, authenticated shielded ownership and independent consensus remain separate evidence tasks.
