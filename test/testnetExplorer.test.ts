import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectTestnetExplorer} from '../src/server/testnetExplorer.js';
import {inspectExplorerObservation} from '../src/observations.js';
import {handleApi} from '../src/server/api.js';
const row=JSON.parse(readFileSync('examples/testnet-refund/refund-observation.json','utf8')) as {txid:string;hex:string};
function source(patch:Record<string,unknown>={},network='testnet'):typeof fetch{return async(input,init)=>{
 assert.equal(init?.redirect,'manual');const path=String(input);assert.ok(path.startsWith('https://api.testnet.zecblock.com/v1/transactions/'+row.txid));
 return Response.json({data:path.endsWith('/raw')?row:{txid:row.txid,blockHeight:'4498296',blockHash:'0'.repeat(64),isCanonical:true,...patch},meta:{network,indexedHeight:4510736}});
};}
test('HTTP-native testnet collector verifies real NU7 bytes and explicit source-network metadata',async()=>{
 const result=await collectTestnetExplorer(row.txid,source(),AbortSignal.timeout(1000));assert.equal(result.data.hex,row.hex);
 assert.equal(inspectExplorerObservation(result.observation,row.txid,'testnet').height,4498296);
 const request=new Request('https://veylens.test/api/zcash-transaction',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json'},body:JSON.stringify({txid:row.txid,network:'testnet'})});
 assert.equal((await handleApi(request,{},source())).status,200);
});
test('explorer rejects wrong networks, IDs, forked status, malformed heights and manufactured mempool blocks',async()=>{
 await assert.rejects(collectTestnetExplorer(row.txid,source({},'mainnet'),AbortSignal.timeout(1000)));
 for(const patch of [{txid:'a'.repeat(64)},{blockHeight:4510737},{blockHash:'invalid'},{isCanonical:false},{blockHeight:'not-a-height'}])await assert.rejects(collectTestnetExplorer(row.txid,source(patch),AbortSignal.timeout(1000)));
 const r=await collectTestnetExplorer(row.txid,source({blockHeight:null,blockHash:null,isCanonical:false}),AbortSignal.timeout(1000));assert.equal(inspectExplorerObservation(r.observation,row.txid,'testnet').confirmations,0);
 assert.throws(()=>inspectExplorerObservation({...r.observation,blockHash:'0'.repeat(64)},row.txid,'testnet'));
});
