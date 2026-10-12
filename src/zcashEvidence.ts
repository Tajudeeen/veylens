import { decodeZcashTransaction, validTransparentAddress, type DecodedZcash, type ZcashNetwork } from "./zcash.js";
import { digestInput, reviewProviderInput, type EvidenceResult } from "./evidence.js";
import type { Evidence, Finding } from "./types.js";
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown): x is string => typeof x === "string" && /^[0-9a-fA-F]{64}$/.test(x);
export const ZCASH_RULESET = "zcash-content/1.0.0";
export function isZcashEvidence(raw: unknown): boolean { return obj(raw) && raw["format"] === "veylens-zcash-evidence/1"; }

export async function reviewZcashEvidence(raw: unknown, now = Math.floor(Date.now() / 1000)): Promise<EvidenceResult> {
  if (!isZcashEvidence(raw) || !obj(raw)) return { ok: false, errors: ["Expected veylens-zcash-evidence/1."] };
  const network = raw["network"];
  if (network !== "mainnet" && network !== "testnet") return { ok: false, errors: ["Explicit mainnet or testnet network is required."] };
  if (!Array.isArray(raw["transactions"]) || raw["transactions"].length < 1 || raw["transactions"].length > 20) return { ok: false, errors: ["Include 1 to 20 raw transaction records."] };
  const decoded = new Map<string, DecodedZcash>(); const errors: string[] = [];
  for (const [i, row] of raw["transactions"].entries()) {
    if (!obj(row) || !id(row["txid"]) || typeof row["hex"] !== "string") { errors.push(`transactions[${i}] needs a 64-hex txid and raw hex.`); continue; }
    const txid = row["txid"].toLowerCase();
    if (decoded.has(txid)) { errors.push(`Duplicate transaction ${txid}.`); continue; }
    try {
      const tx = decodeZcashTransaction(row["hex"], network);
      if (tx.txid !== txid) { errors.push(`transactions[${i}]: raw transaction effects do not match supplied txid.`); continue; }
      if (row["authDigestBytes"] !== undefined && (!id(row["authDigestBytes"]) || tx.authDigest !== row["authDigestBytes"].toLowerCase())) {
        errors.push(`transactions[${i}]: authorizing-data fingerprint mismatch or unsupported for this version.`); continue;
      }
      decoded.set(txid, tx);
    } catch (e) { errors.push(`transactions[${i}]: ${e instanceof Error ? e.message : "Invalid transaction"}`); }
  }
  for (const key of ["refundTxid", "shieldingTxid"]) {
    if (raw[key] !== undefined && (!id(raw[key]) || !decoded.has(raw[key].toLowerCase()))) errors.push(`${key} must refer to an included transaction.`);
  }
  if (raw["refundTo"] !== undefined && (typeof raw["refundTo"] !== "string" || !validTransparentAddress(raw["refundTo"], network))) errors.push("refundTo must be a checksum-valid transparent address for this network. Shielded receiver validation is unsupported.");
  if (raw["refundTxid"] !== undefined && typeof raw["refundTxid"] === "string" && typeof raw["shieldingTxid"] === "string" && raw["refundTxid"].toLowerCase() === raw["shieldingTxid"].toLowerCase()) errors.push("Refund and shielding roles must use distinct transactions.");
  if (errors.length) return { ok: false, errors };
  const facts: Evidence["facts"] = []; const findings: Finding[] = [];
  const gaps = ["Supplied transaction IDs are not anchored to an independently verified canonical chain.", "Transaction signatures, shielded proofs, and ownership are not validated.", "Shielded recipients and the relationship between shielded transactions are not publicly established."];
  for (const [txid, tx] of decoded) {
    const root = `transactions.${txid}`;
    facts.push({ path: `${root}.txid`, value: txid, trust: "raw-effects-match-supplied-id" });
    if (tx.authDigest) facts.push({ path: `${root}.authDigestBytes`, value: tx.authDigest, trust: "locally-computed-fingerprint-not-proof-validation" });
    facts.push({ path: `${root}.version`, value: String(tx.version), trust: "decoded-from-id-matched-bytes" });
    facts.push({ path: `${root}.shieldedCounts`, value: `${tx.saplingSpends} Sapling spends, ${tx.saplingOutputs} Sapling outputs, ${tx.orchardActions} Orchard actions`, trust: "decoded-from-id-matched-bytes" });
    for (const out of tx.outputs) {
      facts.push({ path: `${root}.outputs[${out.index}]`, value: `${out.valueZat} zatoshis to ${out.address ?? "unrecognized script"}`, trust: "decoded-from-id-matched-bytes" });
    }
  }
  if (obj(raw["observation"])) {
    const observation = raw["observation"];
    for (const key of ["source", "observedAt", "reportedBlockHeight", "purpose"]) {
      if (typeof observation[key] === "string" && observation[key].length <= 512) facts.push({ path: `observation.${key}`, value: observation[key], trust: "unverified-source-observation" });
    }
  }
  let refundTo = typeof raw["refundTo"] === "string" ? raw["refundTo"] : undefined;
  let quoteSignature: Evidence["quoteSignature"];
  if (raw["provider"] !== undefined) {
    if (network !== "mainnet") return { ok: false, errors: ["1Click provider association is supported for mainnet bundles only."] };
    const provider = await reviewProviderInput(raw["provider"], now);
    if (!provider.ok) return provider;
    const providerEvidence = provider.report.evidence!;
    const destination = providerEvidence.facts.find(f => f.path === "quoteRequest.refundTo")?.value;
    const refundType = providerEvidence.facts.find(f => f.path === "quoteRequest.refundType")?.value;
    quoteSignature = providerEvidence.quoteSignature;
    facts.push(...providerEvidence.facts.map(f => ({ ...f, path: `provider.${f.path}` })));
    findings.push(...provider.report.findings);
    gaps.push(...providerEvidence.gaps);
    if (refundType !== "ORIGIN_CHAIN") gaps.push("Provider does not configure an origin-chain refund. A transparent output match cannot establish a provider refund.");
    else if (destination && validTransparentAddress(destination, network)) {
      if (refundTo && refundTo !== destination) return { ok: false, errors: ["refundTo conflicts with the provider's configured refund destination."] };
      refundTo = destination;
    } else gaps.push("Provider refund receiver cannot be decoded as a supported transparent address.");
  }
  const refundId = typeof raw["refundTxid"] === "string" ? raw["refundTxid"].toLowerCase() : undefined;
  const shieldId = typeof raw["shieldingTxid"] === "string" ? raw["shieldingTxid"].toLowerCase() : undefined;
  if (refundId && refundTo) {
    const refund = decoded.get(refundId)!;
    const matches = refund.outputs.filter(o => o.address === refundTo && BigInt(o.valueZat) > 0n);
    if (matches.length) {
      findings.push({ ruleId: "transparent-output-to-declared-refund-destination", severity: "medium",
        message: "ID-matched transaction bytes contain a positive transparent output to the declared refund destination. This verifies the public output, not that the transaction is a provider refund or canonically mined.", eventIds: [refundId, "refundTo"] });
      if (shieldId) {
        const shield = decoded.get(shieldId)!;
        const net = BigInt(shield.valueBalanceSaplingZat) + BigInt(shield.valueBalanceOrchardZat);
        const missingPrevouts: string[] = [];
        const sourceAddresses: string[] = [];
        for (const input of shield.inputs) {
          if (input.coinbase) continue;
          const prev = decoded.get(input.txid);
          if (!prev || !prev.outputs[input.index]) missingPrevouts.push(`${input.txid}:${input.index}`);
          else if (prev.outputs[input.index]!.address) sourceAddresses.push(prev.outputs[input.index]!.address!);
        }
        if (missingPrevouts.length) gaps.push(`${missingPrevouts.length} shielding input previous-output record(s) are missing.`);
        const publicAncestors = new Set<string>();
        const walk = (tx: DecodedZcash): void => {
          for (const input of tx.inputs) {
            if (publicAncestors.has(input.txid)) continue;
            publicAncestors.add(input.txid); const prev = decoded.get(input.txid); if (prev) walk(prev);
          }
        };
        walk(shield);
        const hasShieldedOutputs = shield.saplingOutputs > 0 || (shield.orchardActions > 0 && ((shield.orchardFlags ?? 0) & 2) !== 0);
        if (publicAncestors.has(refundId)) gaps.push("The declared refund is an ancestor of the shielding transaction. It cannot demonstrate a later refund-address reuse flow.");
        else if (!hasShieldedOutputs || net >= 0n) gaps.push("The declared shielding transaction does not show net value entering the supported shielded pools.");
        else if (sourceAddresses.includes(refundTo)) {
          findings.push({ ruleId: "public-source-address-reuse-in-supplied-transactions", severity: "high",
            message: "Raw transaction effects establish that a source address spent into a transaction with net shielded inflow also receives a transparent output in the declared refund transaction. The source/output relationship is reproducible. Shared wallet ownership, refund attribution, chronology, and canonical-chain inclusion remain unverified.", eventIds: [shieldId, refundId] });
        }
      } else gaps.push("No shielding transaction and previous-output chain were supplied for source-address reuse checks.");
    } else gaps.push("The declared refund transaction has no positive recognized transparent output to the declared destination.");
  } else gaps.push("No refund transaction/destination pair was supplied. These records are inspection evidence only.");
  const evidence: Evidence = { format: "zcash-transaction-evidence/1", inputDigest: await digestInput(raw), kind: "zcash-transactions", coverage: "incomplete", facts, gaps,
    scope: "Raw transaction effects, exact public outputs and supplied prevout relationships. Not chain consensus, proof validity, wallet ownership, or full privacy certification",
    ...(quoteSignature ? { quoteSignature } : {}) };
  return { ok: true, report: { flowId: refundId ?? [...decoded.keys()][0]!, rulesetVersion: ZCASH_RULESET, generatedAt: now, findings,
    overallResult: findings.some(f => f.severity === "high") ? "fail" : "insufficient", evidence } };
}

/** Converts an exported getrawtransaction result into the explicit network-bound import format. */
export function wrapNodeTransaction(raw: unknown, network: ZcashNetwork): Record<string, unknown> {
  if (!obj(raw) || (network !== "mainnet" && network !== "testnet")) throw new Error("Choose a network and supply node/export JSON.");
  if (raw["error"] !== undefined && raw["error"] !== null) throw new Error("The RPC response contains an error.");
  const payload = obj(raw["result"]) ? raw["result"] : obj(raw["data"]) ? raw["data"] : raw;
  if (!id(payload["txid"]) || typeof payload["hex"] !== "string") throw new Error("Node export needs hex and a transaction ID.");
  if (obj(raw["meta"]) && raw["meta"]["network"] !== undefined && raw["meta"]["network"] !== network) throw new Error("Selected network conflicts with export metadata.");
  const tx = decodeZcashTransaction(payload["hex"], network);
  if (tx.txid !== payload["txid"].toLowerCase()) throw new Error("Raw bytes do not match the exported transaction ID.");
  return { format: "veylens-zcash-evidence/1", network,
    transactions: [{ txid: tx.txid, hex: payload["hex"] }],
    observation: { purpose: "Imported node transaction. Confirmation and ownership are not independently verified.",
      ...(typeof payload["height"] === "number" && Number.isSafeInteger(payload["height"]) ? { reportedBlockHeight: String(payload["height"]) } : {}) } };
}
