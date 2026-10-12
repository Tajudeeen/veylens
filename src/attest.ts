import {
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  createHash,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import type { Report } from "./types.js";
import { canonicalize } from "./canonical.js";

export { canonicalize };

export interface KeyPairPem {
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface SignedReport {
  report: Report;
  reportHash: string;
  signature: string;
  publicKeyPem: string;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export function generateKeyPair(): KeyPairPem {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

export function hashReport(report: Report): string {
  return createHash("sha256").update(canonicalize(report)).digest("hex");
}

export function signReport(report: Report, privateKeyPem: string): SignedReport {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey);
  const reportHash = hashReport(report);
  const signature = cryptoSign(null, Buffer.from(reportHash, "hex"), privateKey);

  return {
    report,
    reportHash,
    signature: signature.toString("base64"),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

/**
 * Deliberately re-hashes and re-verifies from scratch rather than
 * trusting any field on the input - this function has to be able to
 * catch a signed report that's been tampered with after signing, not
 * just confirm the shape looks right.
 */
export function verifySignedReport(signed: SignedReport): VerifyResult {
  const recomputedHash = hashReport(signed.report);
  if (recomputedHash !== signed.reportHash) {
    return {
      valid: false,
      reason: "report hash mismatch: the report contents don't match the embedded hash",
    };
  }

  const publicKey = createPublicKey(signed.publicKeyPem);
  const signatureValid = cryptoVerify(
    null,
    Buffer.from(recomputedHash, "hex"),
    publicKey,
    Buffer.from(signed.signature, "base64"),
  );

  if (!signatureValid) {
    return {
      valid: false,
      reason: "signature does not verify against the embedded public key",
    };
  }

  return { valid: true };
}
