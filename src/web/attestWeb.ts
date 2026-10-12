import type { Report } from "../types.js";
import type { SignedReport, VerifyResult } from "../attest.js";
import { canonicalize } from "../canonical.js";

/**
 * Browser-safe signing and verification using WebCrypto only (SHA-256 and
 * Ed25519). Produces and accepts exactly the same SignedReport shape as
 * the Node implementation in attest.ts; tests cross-verify both ways.
 */

const subtle = (): SubtleCrypto => globalThis.crypto.subtle;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function toBase64(buf: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function spkiToPem(spki: ArrayBuffer): string {
  const lines = toBase64(spki).match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----\n`;
}
function pemToDer(pem: string): Uint8Array {
  return fromBase64(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
}

export async function hashReportWeb(report: Report): Promise<string> {
  const data = new TextEncoder().encode(canonicalize(report));
  return toHex(await subtle().digest("SHA-256", data));
}

/** Ed25519 support varies by browser; callers should catch NotSupportedError. */
export async function signReportWeb(report: Report): Promise<SignedReport> {
  const pair = (await subtle().generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const reportHash = await hashReportWeb(report);
  const signature = await subtle().sign({ name: "Ed25519" }, pair.privateKey, fromHex(reportHash) as BufferSource);
  const spki = await subtle().exportKey("spki", pair.publicKey);
  return { report, reportHash, signature: toBase64(signature), publicKeyPem: spkiToPem(spki) };
}

export async function verifySignedReportWeb(signed: SignedReport): Promise<VerifyResult> {
  let hash: string;
  let key: CryptoKey;
  let sig: Uint8Array;
  try {
    hash = await hashReportWeb(signed.report);
    if (hash !== signed.reportHash) {
      return { valid: false, reason: "report hash mismatch: the report contents don't match the embedded hash" };
    }
    sig = fromBase64(signed.signature);
    key = await subtle().importKey("spki", pemToDer(signed.publicKeyPem) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
  } catch (e) {
    if (e instanceof Error && e.name === "NotSupportedError") throw e;
    return { valid: false, reason: "report, signature or public key is malformed" };
  }
  const ok = await subtle().verify({ name: "Ed25519" }, key, sig as BufferSource, fromHex(hash) as BufferSource);
  return ok ? { valid: true } : { valid: false, reason: "signature does not verify against the embedded public key" };
}
