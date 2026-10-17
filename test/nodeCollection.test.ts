import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256} from '@noble/hashes/sha256';
import {bytesOf,hexOf} from '../src/zcash.js';
import {verifyBlockInclusion} from '../src/chain.js';
import {collectInclusion} from '../src/server/node.js';
import {handleApi} from '../src/server/api.js';
const row=JSON.parse(readFileSync('test/fixtures/zcash/mainnet-inspection.json','utf8')).transactions[0] as {txid:string;hex:string};
const header=new Uint8Array(1487);header[0]=4;header.set(bytesOf(row.txid).reverse(),36);header.set([253,64,5],140);
const blockHash=hexOf(sha256(sha256(header)).reverse());
function transportFor(options:{chain?:string;canonical?:string}={}):typeof fetch{
 return async(input,init)=>{
  assert.equal(String(input),'https://node.test');assert.equal(init?.redirect,'manual');
  assert.equal(new Headers(init?.headers).get('Authorization'),'private-auth');
  const body=JSON.parse(String(init?.body)) as {method:string;params:unknown[]};let result:unknown;
  switch(body.method){
   case 'getrawtransaction':assert.equal(body.params[0],row.txid);result={blockhash:blockHash};break;
   case 'getblock':result={height:100,tx:[row.txid]};break;
   case 'getblockheader':result=hexOf(header);break;
   case 'getblockchaininfo':result={chain:options.chain??'main',blocks:105,bestblockhash:'b'.repeat(64)};break;
   case 'getblockhash':assert.deepEqual(body.params,[100]);result=options.canonical??blockHash;break;
   default:throw new Error('Unexpected RPC method');
  }
  return Response.json({result,error:null});
 };
}
test('configured full-node collection builds a replayable proof using fixed read-only RPC methods',async()=>{
 const proof=await collectInclusion({url:'https://node.test',auth:'private-auth'},row.txid,'mainnet',transportFor(),AbortSignal.timeout(1000));
 assert.equal(verifyBlockInclusion(proof,row.txid,'mainnet').confirmations,6);
 const request=new Request('https://veylens.test/api/zcash-inclusion',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json'},body:JSON.stringify({txid:row.txid,network:'mainnet',method:'sendrawtransaction',url:'http://internal'})});
 const response=await handleApi(request,{ZCASH_MAINNET_RPC_URL:'https://node.test',ZCASH_MAINNET_RPC_AUTH:'private-auth'},transportFor());assert.equal(response.status,200);
 assert.ok(!JSON.stringify(await response.json()).includes('private-auth'));
});
test('full-node network conflicts and forked canonical block observations are rejected',async()=>{
 for(const options of [{chain:'test'},{canonical:'c'.repeat(64)}])await assert.rejects(collectInclusion({url:'https://node.test',auth:'private-auth'},row.txid,'mainnet',transportFor(options),AbortSignal.timeout(1000)));
});
test('unconfigured inclusion endpoint fails explicitly without inventing a proof',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;return Response.json({});};
 const response=await handleApi(new Request('https://veylens.test/api/zcash-inclusion',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json'},body:JSON.stringify({txid:row.txid,network:'mainnet'})}),{},transport);
 assert.equal(response.status,400);assert.equal(calls,0);assert.match((await response.json()).error,/configured full node/);
});
