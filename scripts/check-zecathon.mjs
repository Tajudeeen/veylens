#!/usr/bin/env node
// Offline Zecathon submission preflight. Does not make network requests or certify host eligibility.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
if (args.some(a => a !== '--ci' && !a.startsWith('--manifest=')) || args.filter(a=>a.startsWith('--manifest=')).length>1) {
  console.error('Usage: node scripts/check-zecathon.mjs [--ci] [--manifest=path]');
  process.exit(2);
}
const ci = args.includes('--ci');
const arg = args.find(a => a.startsWith('--manifest='));
const manifestFile = arg ? resolve(process.cwd(), arg.slice(11)) : null;
const checks = [];
function check(id, ok, detail, statusOnFalse = 'fail') {
  checks.push({ id, status: ok ? 'pass' : statusOnFalse, detail });
}
function file(path) {
  const full = resolve(root, path);
  return existsSync(full) && statSync(full).isFile() && statSync(full).size > 0;
}
function read(path) { return readFileSync(resolve(root, path), 'utf8'); }
const required = [
  'README.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md',
  'docs/07-judge-walkthrough.md', 'docs/11-testnet-refund-regression.md',
  'docs/12-release-readiness.md', 'docs/13-finish-checklist.md',
  'docs/17-zecathon-submission-gate.md',
  'examples/testnet-refund/collector-vulnerable.case.json',
  'examples/testnet-refund/collector-corrected.case.json',
];
for (const path of required) check('file:' + path, file(path), file(path) ? 'Nonempty file exists' : 'Missing required evidence or document');

for (const path of ['examples/testnet-refund/collector-vulnerable.case.json','examples/testnet-refund/collector-corrected.case.json']) {
  try {
    const parsed = JSON.parse(read(path));
    check('json:' + path, !!parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Well-formed case object');
  } catch (e) {
    check('json:' + path, false, 'Invalid JSON: ' + e.message);
  }
}
for (const name of ['index','workspace','compare','verify','methodology','demo']) {
  check('web:' + name, file('dist/client/' + name + '.html'), 'Compiled HTML output', 'unverified');
}
let manifest = {};
if (manifestFile) {
  if (!existsSync(manifestFile)) {
    check('manifest',false,'Specified manifest does not exist');
  } else {
    try {
      const data = JSON.parse(readFileSync(manifestFile,'utf8'));
      if (data && typeof data === 'object' && !Array.isArray(data)) manifest=data;
      else check('manifest',false,'Manifest must be a JSON object');
    } catch (e) { check('manifest',false,'Cannot parse manifest: '+e.message); }
  }
}
for (const [id, key, prompt] of [
  ['host-account','hostAccountVerified','Signed-in host account can submit'],
  ['track','hostTrackVerified','Exact host category, rules and eligibility read from logged-in portal'],
  ['test-run','testsPassedOnFinalCommit','npm test, npm run build:web, npm run check:submission and browser tests passed on final commit'],
  ['deployment','deploymentSmokePassed','Public Vercel deployment smoke check passed'],
  ['phone','physicalPhoneChecked','Verified import, verification and navigation on physical phone'],
  ['video','demoVideoReady','Final demo video is recorded and externally accessible'],
  ['form','submissionFieldsVerified','Host-required fields and assets are complete'],
  ['receipt','submissionReceiptSaved','Host confirmed actual submission'],
]) {
  check(id, manifest[key] === true, prompt, 'unverified');
}
const counts = Object.fromEntries(['pass','fail','unverified'].map(status => [status,checks.filter(c=>c.status===status).length]));
const output = { hackathon:'zkSNARKS Zecathon 2026', deadlineUTC:'2026-10-28T23:59:00Z', counts, checks,
  note:'This offline checker cannot validate host eligibility, deployed runtime secrets, external attestations, mainnet consensus, or ownership. A passed local check never upgrades unverified external claims.' };
console.log(JSON.stringify(output,null,2));
if (counts.fail) process.exitCode=2;
else if (counts.unverified && !ci) process.exitCode=3;
