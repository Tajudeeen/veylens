import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewCase,compareCaseReports,findRefundCandidates} from '../src/case.js';
import {checkSourceRecord} from '../src/evidence.js';
import {signCollection,verifyCollection} from '../src/collection.js';
import {generateKeyPairSync,verify} from 'node:crypto';
import {stableMetadata} from '../src/canonical.js';
import {decodeZcashTransaction,bytesOf,hexOf} from '../src/zcash.js';
import {signReport,generateKeyPair,verifySignedReport} from '../src/attest.js';
const real=JSON.parse(readFileSync('test/fixtures/zcash/mainnet-inspection.json','utf8'));
const quote=JSON.parse(readFileSync('test/fixtures/evidence/oneclick-live-dry-quote.json','utf8'));
import {controlledCase} from './helpers/case.js';
test('complete structural case establishes reuse and exports a replayable signed report',async()=>{const input=controlledCase(),r=await reviewCase(input,1234);assert.ok(r.ok);assert.equal(r.report.overallResult,'fail');assert.ok(r.report.findings.some(f=>f.ruleId.includes('public-source-address-reuse')));assert.ok(r.report.evidence!.facts.some(f=>f.path.startsWith('remedy.')));const signed=signReport(r.report,generateKeyPair().privateKeyPem);assert.equal(verifySignedReport(signed).valid,true);assert.equal((await checkSourceRecord(input,r.report)).valid,true);const altered=structuredClone(r.report);altered.evidence!.facts.find(f=>f.path==='case.refundAssociation')!.value='consensus proven';assert.equal((await checkSourceRecord(input,altered)).valid,false);});
test('independent corrected-case comparison removes reuse without granting a privacy pass',async()=>{const a=await reviewCase(controlledCase()),b=await reviewCase(controlledCase(true));assert.ok(a.ok&&b.ok);const diff=compareCaseReports(a.report,b.report);assert.ok(diff.removed.some(r=>r.includes('reuse')));assert.equal(b.report.overallResult,'insufficient');assert.match(diff.notice,/do not establish privacy/);});
test('actual historical transaction remains inspection evidence, not an invented refund',async()=>{const r=await reviewCase({...real,format:'veylens-case/1'});assert.ok(r.ok);assert.equal(r.report.findings.length,0);assert.ok(r.report.evidence!.facts.some(f=>f.path==='case.refundAssociation'&&f.value==='not established'));});
test('signed dry quote is analysed without creating fake executed relationships',async()=>{const r=await reviewCase({format:'veylens-case/1',network:'mainnet',transactions:[],provider:quote});assert.ok(r.ok);assert.equal(r.report.evidence!.quoteSignature,'valid');assert.match(r.report.evidence!.gaps.join(' '),/dry quote cannot establish/i);assert.ok(r.report.evidence!.facts.some(f=>f.path==='case.refundCandidates'&&f.value==='0'));});
test('malformed roles, duplicate bytes, invalid receiver and forged collector receipt fail closed',async()=>{for(const input of [{...controlledCase(),refundTxid:'0'.repeat(64)},{...controlledCase(),refundTo:'t1bad'},{...controlledCase(),transactions:[...controlledCase().transactions,controlledCase().transactions[0]]},{...real,format:'veylens-case/1',transactions:[{...real.transactions[0],receipt:{source:'zcash-explorer'}}]}])assert.equal((await reviewCase(input)).ok,false);});
test('collector signature binds content, source and request and rejects substituted keys',async()=>{const pair=generateKeyPairSync('ed25519');const key=pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');const data={txid:'a'.repeat(64),hex:'abcd'},request={txid:data.txid,network:'mainnet'};const receipt=await signCollection(data,'zcash-explorer',request,key);const {signature,...payload}=receipt;assert.equal(verify(null,Buffer.from(stableMetadata(payload)),pair.publicKey,Buffer.from(signature,'base64')),true);assert.equal(await verifyCollection(data,receipt,'zcash-explorer',request),false);assert.equal(await verifyCollection({...data,hex:'beef'},receipt,'zcash-explorer',request),false);});

test('refund candidates require an origin hash, destination and exact aggregate amount',()=>{
 const input=controlledCase();const tx=decodeZcashTransaction(input.transactions[2]!.hex,'mainnet');const address=tx.outputs[0]!.address!;
 assert.equal(findRefundCandidates([tx],new Set([tx.txid]),[address],100000000n).length,1);
 assert.equal(findRefundCandidates([tx],new Set(),[address],100000000n).length,0);
 assert.equal(findRefundCandidates([tx],new Set([tx.txid]),[address],999n).length,0);
 assert.equal(findRefundCandidates([tx],new Set([tx.txid]),['different-address'],100000000n).length,0);
 assert.equal(findRefundCandidates([tx],new Set([tx.txid]),[address],100000000n,tx.txid).length,0);
});
test('captured deployed collector receipt authenticates real mainnet bytes and rejects tampering',async()=>{
 const input=JSON.parse(readFileSync('test/fixtures/cases/collector-mainnet-inspection.json','utf8'));const r=await reviewCase(input,1234);assert.ok(r.ok);assert.ok(r.report.evidence!.facts.some(f=>f.path==='case.rawRecords'&&f.value.includes('1 collector-authenticated')));assert.equal((await checkSourceRecord(input,r.report)).valid,true);
 for(const modify of [(x:typeof input)=>{x.transactions[0].receipt.signature='AAAA';},(x:typeof input)=>{x.transactions[0].receipt.request.network='testnet';},(x:typeof input)=>{x.transactions[0].receipt.observedAt='2000-01-01T00:00:00Z';}]){const tampered=structuredClone(input);modify(tampered);assert.equal((await reviewCase(tampered)).ok,false);}
});

test('comparison warns when a removed reuse finding coincides with missing source records',async()=>{
 const original=controlledCase();const incomplete={...original,transactions:original.transactions.slice(1)};const a=await reviewCase(original),b=await reviewCase(incomplete);assert.ok(a.ok&&b.ok);const diff=compareCaseReports(a.report,b.report);assert.ok(diff.removed.some(r=>r.includes('reuse')));assert.ok(diff.evidenceWarnings.some(g=>g.includes('fewer raw transaction')));assert.ok(diff.evidenceWarnings.some(g=>g.includes('previous-output')));
});
