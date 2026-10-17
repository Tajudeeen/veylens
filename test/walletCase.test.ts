import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectWalletExport,sanitizeWalletExport} from '../src/wallet.js';
import {reviewCase} from '../src/case.js';
import {reviewCaseV2} from '../src/legacy/case-v2.js';
import {reviewCaseV1} from '../src/legacy/case-v1.js';
import {checkSourceRecord} from '../src/evidence.js';
import {controlledCase} from './helpers/case.js';
const corrected=JSON.parse(readFileSync('examples/testnet-refund/corrected.case.json','utf8'));
test('Ironwood wallet exports attach to actual NU7 transaction IDs without promoting assertions',async()=>{
 const wallet={txid:corrected.refundTxid,spends:[],outputs:[{pool:'ironwood',address:'private-address',memo:'private-memo'}],seed:'never-export-this'};
 const sanitized=sanitizeWalletExport(wallet);assert.equal(inspectWalletExport(sanitized).pools[0],'ironwood');assert.ok(!JSON.stringify(sanitized).includes('memo'));assert.ok(!JSON.stringify(sanitized).includes('never-export'));
 const raw={...corrected,walletEvidence:[{network:'testnet',txid:corrected.refundTxid,export:sanitized}]};const result=await reviewCase(raw,1234);assert.ok(result.ok);assert.equal(result.report.overallResult,'insufficient');
 assert.ok(result.report.evidence!.facts.some(f=>f.path.startsWith('wallet.')&&f.trust.includes('unverified')));assert.ok(!JSON.stringify(result.report).includes('private-address'));
 assert.equal((await checkSourceRecord(raw,result.report)).valid,true);
});
test('wallet network, ID, pool conflicts and RPC errors fail closed',async()=>{
 const base={network:'testnet',txid:corrected.refundTxid,export:{txid:corrected.refundTxid,spends:[],outputs:[{pool:'ironwood'}]}};
 for(const patch of [{network:'mainnet'},{txid:'a'.repeat(64)},{export:{...base.export,txid:'a'.repeat(64)}},{export:{...base.export,outputs:[{pool:'orchard'}]}}])assert.equal((await reviewCase({...corrected,walletEvidence:[{...base,...patch}]})).ok,false);
 assert.throws(()=>inspectWalletExport({error:{message:'RPC failed'},result:base.export}));
});
test('old v0.9 case reports remain replayable through the frozen ruleset',async()=>{
 const input=controlledCase();const old=await reviewCaseV1(input,1234);assert.ok(old.ok);assert.equal(old.report.rulesetVersion,'case-review/1.1.0');assert.equal((await checkSourceRecord(input,old.report)).valid,true);
 const current=await reviewCase(input,1234);assert.ok(current.ok);assert.equal(current.report.rulesetVersion,'case-review/1.3.0');assert.equal((await checkSourceRecord(input,current.report)).valid,true);
});
test('case importer rejects forged authorization fingerprints and null receipts',async()=>{
 for(const extra of [{authDigestBytes:'0'.repeat(64)},{receipt:null}]){
 const input=controlledCase();assert.equal((await reviewCase({...input,transactions:input.transactions.map((r,i)=>i===0?{...r,...extra}:r)})).ok,false);}
});

test('initial v1.0 exports keep their original case-review/1.2.0 replay contract',async()=>{const source=controlledCase();const result=await reviewCaseV2(source,1234);assert.ok(result.ok);assert.equal((await checkSourceRecord(source,result.report)).valid,true);});
