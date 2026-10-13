import { blake2b } from "@noble/hashes/blake2";
import { sha256 } from "@noble/hashes/sha256";
import { base58 } from "@scure/base";

export const hexOf = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
export function bytesOf(hex: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex) || hex.length > 2_000_000) throw new Error("Transaction hex must be even-length hexadecimal, up to 1 MB.");
  return Uint8Array.from(hex.match(/../g)!, b => parseInt(b, 16));
}
const cat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out;
};
const ascii = (s: string): Uint8Array => Uint8Array.from(s, c => c.charCodeAt(0));
const hash = (person: string | Uint8Array, ...parts: Uint8Array[]): Uint8Array => blake2b(cat(...parts), { dkLen: 32, personalization: typeof person === "string" ? ascii(person) : person });
const displayedHash = (x: Uint8Array): string => hexOf(Uint8Array.from(x).reverse());
class Reader {
  pos = 0;
  constructor(readonly bytes: Uint8Array) {}
  take(n: number): Uint8Array {
    if (!Number.isSafeInteger(n) || n < 0 || this.pos + n > this.bytes.length) throw new Error("Truncated or oversized transaction field.");
    const b = this.bytes.slice(this.pos, this.pos + n); this.pos += n; return b;
  }
  u32(): number { const b = this.take(4); return new DataView(b.buffer).getUint32(0, true); }
  compact(limit = 10_000): number {
    const tag = this.take(1)[0]!;
    let n: bigint;
    if (tag < 253) n = BigInt(tag);
    else { const b = this.take(tag === 253 ? 2 : tag === 254 ? 4 : 8); n = littleInt(b);
      if (n < (tag === 253 ? 253n : tag === 254 ? 65536n : 4294967296n)) throw new Error("Non-canonical CompactSize."); }
    if (n > BigInt(limit)) throw new Error("Transaction collection exceeds supported bound.");
    return Number(n);
  }
  vector(limit = 1_000_000): Uint8Array { return this.take(this.compact(limit)); }
}
function littleInt(b: Uint8Array): bigint { let n = 0n; for (let i = b.length - 1; i >= 0; i--) n = n * 256n + BigInt(b[i]!); return n; }
function signed64(b: Uint8Array): bigint { const n = littleInt(b); return n >= 1n << 63n ? n - (1n << 64n) : n; }
export type ZcashNetwork = "mainnet" | "testnet";
export interface TransparentOutput { index: number; valueZat: string; scriptHex: string; address: string | null; }
export interface DecodedZcash {
  version: 4 | 5 | 6; txid: string; authDigest: string | null; branchId: string | null;
  inputs: Array<{ txid: string; index: number; coinbase: boolean }>;
  outputs: TransparentOutput[]; saplingSpends: number; saplingOutputs: number; orchardActions: number;
  valueBalanceSaplingZat: string; valueBalanceOrchardZat: string; orchardFlags: number | null;
  ironwoodActions: number; valueBalanceIronwoodZat: string; ironwoodFlags: number | null;
}
function readOrchardBundle(r: Reader, version: 5 | 6, ironwood: boolean) {
  const count = r.compact();
  const actions = Array.from({ length: count }, () => r.take(820));
  const flags = count ? r.take(1) : new Uint8Array();
  if (count && (flags[0]! & ~(ironwood ? 7 : 3)) !== 0) throw new Error("Reserved shielded bundle flags are not supported.");
  const balance = count ? r.take(8) : new Uint8Array(8);
  const anchor = count ? r.take(32) : new Uint8Array();
  const proof = count ? r.vector() : new Uint8Array();
  const signatures = r.take(64 * count);
  const binding = count ? r.take(64) : new Uint8Array();
  const domains = ironwood
    ? ["ZTxIdIronwd_H_v6", "ZTxIdIrnActCH_v6", "ZTxIdIrnActMH_v6", "ZTxIdIrnActNH_v6", "ZTxAuthIrnwdH_v6"] as const
    : [version === 6 ? "ZTxIdOrchardH_v6" : "ZTxIdOrchardHash", "ZTxIdOrcActCHash", "ZTxIdOrcActMHash", "ZTxIdOrcActNHash", version === 6 ? "ZTxAuthOrchaH_v6" : "ZTxAuthOrchaHash"] as const;
  const effect = hash(domains[0], ...(count ? [
    hash(domains[1], ...actions.map(a => cat(a.slice(32, 64), a.slice(96, 212)))),
    hash(domains[2], ...actions.map(a => a.slice(212, 724))),
    hash(domains[3], ...actions.map(a => cat(a.slice(0, 32), a.slice(64, 96), a.slice(724, 820)))),
    flags, balance, ...(version === 5 ? [anchor] : [])] : []));
  const auth = hash(domains[4], proof, signatures, binding, ...(version === 6 ? [anchor] : []));
  return { count, flags: count ? flags[0]! : null, balance: signed64(balance).toString(), effect, auth };
}
function addressForScript(script: Uint8Array, network: ZcashNetwork): string | null {
  const s = hexOf(script);
  let prefix: number[]; let payload: Uint8Array;
  if (/^76a914[0-9a-f]{40}88ac$/.test(s)) { prefix = network === "mainnet" ? [0x1c, 0xb8] : [0x1d, 0x25]; payload = script.slice(3, 23); }
  else if (/^a914[0-9a-f]{40}87$/.test(s)) { prefix = network === "mainnet" ? [0x1c, 0xbd] : [0x1c, 0xba]; payload = script.slice(2, 22); }
  else return null;
  const body = cat(Uint8Array.from(prefix), payload);
  return base58.encode(cat(body, sha256(sha256(body)).slice(0, 4)));
}
export function validTransparentAddress(address: string, network: ZcashNetwork): boolean {
  try {
    if (address.length > 100) return false;
    const b = base58.decode(address); if (b.length !== 26) return false;
    const prefix = b[0]! * 256 + b[1]!;
    const prefixes = network === "mainnet" ? [0x1cb8, 0x1cbd] : [0x1d25, 0x1cba];
    return prefixes.includes(prefix) && hexOf(b.slice(-4)) === hexOf(sha256(sha256(b.slice(0, -4))).slice(0, 4));
  } catch { return false; }
}

/** ZIP-225/244 effect and authorizing-data fingerprints. Not consensus/proof validation. */
export function decodeZcashTransaction(hex: string, network: ZcashNetwork): DecodedZcash {
  if (network !== "mainnet" && network !== "testnet") throw new Error("Specify mainnet or testnet.");
  const bytes = bytesOf(hex); const r = new Reader(bytes);
  const header = r.u32(); const version = header & 0x7fffffff;
  if (header >>> 31 !== 1 || (version !== 4 && version !== 5 && version !== 6)) throw new Error("Only overwintered Zcash v4, v5 and NU6.3 v6 are supported.");
  const group = r.u32();
  if (group !== (version === 4 ? 0x892f2085 : version === 5 ? 0x26a7270a : 0xd884b698)) throw new Error("Unexpected version group ID.");
  let branchBytes: Uint8Array | null = null;
  if (version >= 5) { branchBytes = r.take(4); r.take(8); }
  if (version === 6 && !["5b16a537", "d90a1977"].includes(hexOf(branchBytes!))) throw new Error("Unsupported v6 consensus branch.");
  const inputs: DecodedZcash["inputs"] = []; const prevouts: Uint8Array[] = []; const sequences: Uint8Array[] = []; const scripts: Uint8Array[] = [];
  const nInputs = r.compact();
  for (let i = 0; i < nInputs; i++) {
    const outpoint = r.take(36); prevouts.push(outpoint);
    const txid = displayedHash(outpoint.slice(0, 32)); const index = new DataView(outpoint.buffer).getUint32(32, true);
    inputs.push({ txid, index, coinbase: txid === "0".repeat(64) && index === 0xffffffff });
    const before = r.pos; r.vector(); scripts.push(bytes.slice(before, r.pos)); sequences.push(r.take(4));
  }
  const outputs: TransparentOutput[] = []; const outputBytes: Uint8Array[] = [];
  const nOutputs = r.compact();
  for (let i = 0; i < nOutputs; i++) {
    const start = r.pos; const amount = r.take(8); const script = r.vector();
    const value = signed64(amount); if (value < 0n || value > 2_100_000_000_000_000n) throw new Error("Transparent output amount outside supported money range.");
    outputs.push({ index: i, valueZat: value.toString(), scriptHex: hexOf(script), address: addressForScript(script, network) });
    outputBytes.push(bytes.slice(start, r.pos));
  }
  if (version === 4) {
    r.take(8); const balance = r.take(8); const nSpends = r.compact(); r.take(384 * nSpends);
    const nShieldedOut = r.compact(); r.take(948 * nShieldedOut);
    const nJoinSplits = r.compact(); r.take(1698 * nJoinSplits); if (nJoinSplits) r.take(96);
    if (nSpends + nShieldedOut) r.take(64);
    if (r.pos !== bytes.length) throw new Error("Trailing data or unsupported transaction extension.");
    return { version, txid: displayedHash(sha256(sha256(bytes))), authDigest: null, branchId: null, inputs, outputs,
      saplingSpends: nSpends, saplingOutputs: nShieldedOut, orchardActions: 0,
      valueBalanceSaplingZat: signed64(balance).toString(), valueBalanceOrchardZat: "0", orchardFlags: null,
      ironwoodActions: 0, valueBalanceIronwoodZat: "0", ironwoodFlags: null };
  }
  const nSpends = r.compact(); const spends = Array.from({ length: nSpends }, () => r.take(96));
  const nShieldedOut = r.compact(); const shieldedOut = Array.from({ length: nShieldedOut }, () => r.take(756));
  const sapBalance = nSpends + nShieldedOut ? r.take(8) : new Uint8Array(8);
  const anchor = nSpends ? r.take(32) : new Uint8Array();
  const spendProofs = r.take(192 * nSpends); const spendSigs = r.take(64 * nSpends); const outputProofs = r.take(192 * nShieldedOut);
  const sapBinding = nSpends + nShieldedOut ? r.take(64) : new Uint8Array();
  const orchard = readOrchardBundle(r, version, false);
  const ironwood = version === 6 ? readOrchardBundle(r, version, true) : null;
  if (r.pos !== bytes.length) throw new Error("Trailing data or unsupported transaction extension.");
  const transparent = hash("ZTxIdTranspaHash", ...(nInputs + nOutputs ? [hash("ZTxIdPrevoutHash", ...prevouts), hash("ZTxIdSequencHash", ...sequences), hash("ZTxIdOutputsHash", ...outputBytes)] : []));
  const spendHash = hash("ZTxIdSSpendsHash", ...(nSpends ? [hash("ZTxIdSSpendCHash", ...spends.map(s => s.slice(32, 64))), hash(version === 6 ? "ZTxIdSSpendNH_v6" : "ZTxIdSSpendNHash", ...spends.map(s => cat(s.slice(0, 32), ...(version === 5 ? [anchor] : []), s.slice(64, 96))))] : []));
  const outputHash = hash("ZTxIdSOutputHash", ...(nShieldedOut ? [
    hash("ZTxIdSOutC__Hash", ...shieldedOut.map(s => s.slice(32, 148))),
    hash("ZTxIdSOutM__Hash", ...shieldedOut.map(s => s.slice(148, 660))),
    hash("ZTxIdSOutN__Hash", ...shieldedOut.map(s => cat(s.slice(0, 32), s.slice(660, 756))))] : []));
  const sapling = hash("ZTxIdSaplingHash", ...(nSpends + nShieldedOut ? [spendHash, outputHash, sapBalance] : []));
  const txDigest = hash(cat(ascii("ZcashTxHash_"), branchBytes!), hash("ZTxIdHeadersHash", bytes.slice(0, 20)), transparent, sapling, orchard.effect, ...(ironwood ? [ironwood.effect] : []));
  const authDigest = hash(cat(ascii("ZTxAuthHash_"), branchBytes!), hash("ZTxAuthTransHash", ...scripts),
    hash(version === 6 ? "ZTxAuthSapliH_v6" : "ZTxAuthSapliHash", spendProofs, spendSigs, outputProofs, sapBinding, ...(version === 6 ? [anchor] : [])), orchard.auth, ...(ironwood ? [ironwood.auth] : []));
  return { version, txid: displayedHash(txDigest), authDigest: hexOf(authDigest), branchId: hexOf(branchBytes!), inputs, outputs,
    saplingSpends: nSpends, saplingOutputs: nShieldedOut, orchardActions: orchard.count,
    valueBalanceSaplingZat: signed64(sapBalance).toString(), valueBalanceOrchardZat: orchard.balance, orchardFlags: orchard.flags,
    ironwoodActions: ironwood?.count ?? 0, valueBalanceIronwoodZat: ironwood?.balance ?? "0", ironwoodFlags: ironwood?.flags ?? null };
}
