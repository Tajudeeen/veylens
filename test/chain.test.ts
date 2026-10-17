import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from '@noble/hashes/sha256';
import {buildBlockInclusion,verifyBlockInclusion} from '../src/chain.js';
import {bytesOf,hexOf} from '../src/zcash.js';
import {reviewCase} from '../src/case.js';
import {checkSourceRecord} from '../src/evidence.js';
import {controlledCase} from './helpers/case.js';
function fixture(txid='a'.repeat(64)){
 const txids=[txid,'b'.repeat(64),'c'.repeat(64)];let layer=txids.map(s=>bytesOf(s).reverse());
 while(layer.length>1){const next:Uint8Array[]=[];for(let i=0;i<layer.length;i+=2)next.push(sha256(sha256(new Uint8Array([...layer[i]!,...(layer[i+1]??layer[i]!)]))));layer=next;}
 // Synthetic, invalid Equihash solution. This tests inclusion arithmetic, never consensus.
 const header=new Uint8Array(1487);header[0]=4;header.set(layer[0]!,36);header.set([253,64,5],140);
 const blockHash=hexOf(sha256(sha256(header)).reverse());
 return buildBlockInclusion({network:'mainnet',txid,headerHex:hexOf(header),blockHash,height:10,canonicalBlockHash:blockHash,tipHash:'d'.repeat(64),tipHeight:15},txids);
}
test('portable Merkle proof checks an odd-width tree, serialized header and source confirmations',()=>{
 const proof=fixture();assert.deepEqual(verifyBlockInclusion(proof,proof.txid,'mainnet'),{blockHash:proof.blockHash,height:10,confirmations:6});
 const tail=fixture('e'.repeat(64));assert.ok(tail.siblings.length===2);
});
test('Merkle/header tampering, extra branches, wrong counts, indexes and networks fail closed',()=>{
 const original=fixture();
 for(const patch of [
  {siblings:['f'.repeat(64),...original.siblings.slice(1)]},{siblings:[...original.siblings,'a'.repeat(64)]},
  {headerHex:'00'+original.headerHex.slice(2)},{transactionIndex:3},{transactionCount:1},
  {blockHash:'0'.repeat(64)},{canonicalBlockHash:'0'.repeat(64)},{height:16},{network:'testnet'},
  {tipHeight:10,tipHash:'0'.repeat(64)}
 ])assert.throws(()=>verifyBlockInclusion({...original,...patch},original.txid,'mainnet'));
 assert.throws(()=>buildBlockInclusion({...original},[original.txid,original.txid]));
});
test('case reports include independently replayed inclusion while preserving consensus limits',async()=>{
 const input=controlledCase();const row=input.transactions[2]!;const raw={...input,transactions:input.transactions.map(r=>r.txid===row.txid?{...r,chainProof:fixture(row.txid)}:r)};
 const r=await reviewCase(raw,1234);assert.ok(r.ok);assert.ok(r.report.evidence!.facts.some(f=>f.path.startsWith('chain.')));
 assert.ok(r.report.evidence!.gaps.some(g=>g.includes('Equihash')));assert.equal((await checkSourceRecord(raw,r.report)).valid,true);
 const bad=structuredClone(raw);const changed=bad.transactions[2]!;assert.ok('chainProof' in changed);changed.chainProof.siblings[0]='e'.repeat(64);assert.equal((await reviewCase(bad)).ok,false);
});
test('forged inclusion receipts and receipts without proofs are rejected',async()=>{
 const input=controlledCase();for(const extra of [{chainReceipt:null},{chainProof:fixture(input.transactions[2]!.txid),chainReceipt:{signature:'AAAA'}}]){
 assert.equal((await reviewCase({...input,transactions:input.transactions.map((r,i)=>i===2?{...r,...extra}:r)})).ok,false);}
});
