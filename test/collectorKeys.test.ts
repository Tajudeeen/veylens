import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {signCollection,verifyCollection} from '../src/collection.js';
import {LEGACY_COLLECTOR_KEY_ID,type CollectorKey} from '../src/collectorKeys.js';
import {readFileSync} from 'node:fs';
test('key IDs authenticate new receipts, retired keys replay and revoked/unknown keys fail',async()=>{
 const pair=generateKeyPairSync('ed25519');const privateKey=pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64');const publicKey=pair.publicKey.export({format:'der',type:'spki'}).toString('base64');
 const policy:Record<string,CollectorKey>={rotation:{publicKey,status:'active',notBefore:'2026-01-01T00:00:00Z'}};
 const data={test:'bound'},receipt=await signCollection(data,'configured-node',{},privateKey,'rotation');
 assert.equal(receipt.format,'veylens-collection/2');assert.equal(await verifyCollection(data,receipt,'configured-node',{},policy),true);
 policy.rotation!.status='retired';assert.equal(await verifyCollection(data,receipt,'configured-node',{},policy),true);
 policy.rotation!.notAfter='2026-01-02T00:00:00Z';assert.equal(await verifyCollection(data,receipt,'configured-node',{},policy),false);delete policy.rotation!.notAfter;
 policy.rotation!.status='revoked';assert.equal(await verifyCollection(data,receipt,'configured-node',{},policy),false);
 assert.equal(await verifyCollection(data,{...receipt,keyId:'unknown'},'configured-node',{},policy),false);
 assert.equal(await verifyCollection(data,{...receipt,keyId:'__proto__'},'configured-node',{},policy),false);
 assert.equal(await verifyCollection({...data,test:'changed'},receipt,'configured-node',{},policy),false);
});
test('legacy pinned specimens remain valid and cannot acquire an unsigned key ID',async()=>{
 const input=JSON.parse(readFileSync('examples/testnet-refund/collector-vulnerable.case.json','utf8'));const row=input.transactions[0];const binding={txid:row.txid,network:input.network};
 assert.equal(await verifyCollection({txid:row.txid,hex:row.hex},row.receipt,row.receipt.source,binding),true);
 assert.equal(await verifyCollection({txid:row.txid,hex:row.hex},{...row.receipt,keyId:LEGACY_COLLECTOR_KEY_ID},row.receipt.source,binding),false);
});
