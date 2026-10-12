/**
 * Plain-JS verifier embedded in the HTML report. It is kept as a string
 * so the exact same text is (a) inlined in the page, (b) hashed for the
 * page's Content-Security-Policy, and (c) evaluated in Node by the test
 * suite to prove it agrees with attest.ts. Uses only WebCrypto
 * (SHA-256, Ed25519), so the page needs no network and no libraries.
 */
export const VERIFY_SCRIPT = String.raw`
function hexToBytes(h) {
  var a = new Uint8Array(h.length / 2);
  for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}
function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(function (x) {
    return x.toString(16).padStart(2, "0");
  }).join("");
}
function stableMetadata(x) {
  if (Array.isArray(x)) return "[" + x.map(stableMetadata).join(",") + "]";
  if (x && typeof x === "object") return "{" + Object.keys(x).sort().filter(function(k) { return x[k] !== undefined; }).map(function(k) { return JSON.stringify(k) + ":" + stableMetadata(x[k]); }).join(",") + "}";
  return JSON.stringify(x) || "null";
}
function canonicalize(r) {
  return JSON.stringify({
    flowId: r.flowId,
    rulesetVersion: r.rulesetVersion,
    generatedAt: r.generatedAt,
    findings: r.findings.map(function (f) {
      return { ruleId: f.ruleId, severity: f.severity, message: f.message, eventIds: f.eventIds.slice() };
    }),
    overallResult: r.overallResult,
    ...(r.evidence ? { evidence: JSON.parse(stableMetadata(r.evidence)) } : {})
  });
}
function pemToDer(pem) {
  var b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  var bin = atob(b64);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function verifyReport(signed) {
  var hash, key, sig;
  try {
    var data = new TextEncoder().encode(canonicalize(signed.report));
    hash = bytesToHex(await crypto.subtle.digest("SHA-256", data));
    if (hash !== signed.reportHash) {
      return { valid: false, reason: "report hash mismatch: the report contents don't match the embedded hash" };
    }
    var bin = atob(signed.signature);
    sig = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) sig[i] = bin.charCodeAt(i);
    key = await crypto.subtle.importKey("spki", pemToDer(signed.publicKeyPem), { name: "Ed25519" }, false, ["verify"]);
  } catch (e) {
    if (e && e.name === "NotSupportedError") throw e;
    return { valid: false, reason: "report, signature or public key is malformed" };
  }
  var ok = await crypto.subtle.verify({ name: "Ed25519" }, key, sig, hexToBytes(hash));
  return ok
    ? { valid: true }
    : { valid: false, reason: "signature does not verify against the embedded public key" };
}
`;
