import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewCase,compareCaseReports} from '../src/case.js';
import {decodeZcashTransaction} from '../src/zcash.js';
import {checkSourceRecord} from '../src/evidence.js';
import {generateKeyPair,signReport,verifySignedReport} from '../src/attest.js';

const folder='examples/testnet-refund/';
const vulnerable=JSON.parse(readFileSync(folder+'vulnerable.case.json','utf8'));
const corrected=JSON.parse(readFileSync(folder+'corrected.case.json','utf8'));
const fingerprints=JSON.parse(readFileSync(folder+'sdk-fingerprints.json','utf8')) as Array<{txid:string;authDigestBytes:string}>;

test('actual testnet case IDs and authorization fingerprints match librustzcash',()=>{
  for(const record of corrected.transactions){
    const tx=decodeZcashTransaction(record.hex,'testnet');
    assert.equal(tx.txid,record.txid);
    assert.equal(tx.authDigest,fingerprints.find(f=>f.txid===tx.txid)?.authDigestBytes);
  }
});
test('actual testnet prevout and transparent refund reproduce the reuse failure',async()=>{
  const result=await reviewCase(vulnerable,1234);assert.ok(result.ok);
  assert.equal(result.report.overallResult,'fail');
  const finding=result.report.findings.find(f=>f.ruleId==='public-source-address-reuse-in-supplied-transactions');
  assert.ok(finding);
  assert.deepEqual(finding.eventIds,[vulnerable.shieldingTxid,vulnerable.refundTxid]);
  const refund=decodeZcashTransaction(vulnerable.transactions.find((t:{txid:string})=>t.txid===vulnerable.refundTxid).hex,'testnet');
  assert.equal(refund.outputs[0]?.address,vulnerable.refundTo);
  assert.equal(refund.outputs[0]?.valueZat,'3000000');
  const signed=signReport(result.report,generateKeyPair().privateKeyPem);
  assert.equal(verifySignedReport(signed).valid,true);
  assert.equal((await checkSourceRecord(vulnerable,result.report)).valid,true);
});
test('actual shielded comparison removes reuse while retaining delivery and consensus limits',async()=>{
  const a=await reviewCase(vulnerable,1234),b=await reviewCase(corrected,1234);assert.ok(a.ok&&b.ok);
  const comparison=compareCaseReports(a.report,b.report);
  assert.ok(comparison.removed.includes('public-source-address-reuse-in-supplied-transactions'));
  assert.equal(b.report.overallResult,'insufficient');
  assert.equal(b.report.flowId,corrected.refundTxid);
  assert.ok(b.report.evidence!.gaps.some(g=>g.includes('Shielded refund delivery')));
  const refund=decodeZcashTransaction(corrected.transactions.find((t:{txid:string})=>t.txid===corrected.refundTxid).hex,'testnet');
  assert.equal(refund.outputs.length,0);
  assert.ok(refund.ironwoodActions>0);
  assert.equal((await checkSourceRecord(corrected,b.report)).valid,true);
});

test('deployed v1.0 testnet collector receipts authenticate the real vulnerable case and independent replay',async()=>{
 const input=JSON.parse(readFileSync(folder+'collector-vulnerable.case.json','utf8'));const result=await reviewCase(input,1234);assert.ok(result.ok);assert.equal(result.report.overallResult,'fail');assert.equal((await checkSourceRecord(input,result.report)).valid,true);
 assert.ok(result.report.evidence!.facts.some(f=>f.path==='case.rawRecords'&&f.value.includes('4 collector-authenticated')));
 const changed=structuredClone(input);changed.transactions[0].observation.reportedHeight++;assert.equal((await reviewCase(changed)).ok,false);
});

test('deployed shielded comparison preserves authenticated coverage and removes reuse without certifying delivery',async()=>{
 const a=JSON.parse(readFileSync(folder+'collector-vulnerable.case.json','utf8')),b=JSON.parse(readFileSync(folder+'collector-corrected.case.json','utf8'));
 const before=await reviewCase(a,1234),after=await reviewCase(b,1234);assert.ok(before.ok&&after.ok);assert.equal(after.report.overallResult,'insufficient');assert.equal((await checkSourceRecord(b,after.report)).valid,true);
 const comparison=compareCaseReports(before.report,after.report);assert.ok(comparison.removed.includes('public-source-address-reuse-in-supplied-transactions'));assert.ok(!comparison.evidenceWarnings.some(g=>g.includes('fewer collector-authenticated')));
 assert.ok(after.report.evidence!.facts.some(f=>f.path==='case.rawRecords'&&f.value.includes('5 collector-authenticated')));
});
