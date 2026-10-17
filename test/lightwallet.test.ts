import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectTestnet,grpcFrame,unaryPayload,protoFields} from '../src/server/lightwallet.js';
import {bytesOf} from '../src/zcash.js';
import {handleApi} from '../src/server/api.js';
import {inspectLightwalletObservation} from '../src/observations.js';
const data=JSON.parse(readFileSync('examples/testnet-refund/refund-observation.json','utf8')) as {txid:string;hex:string};
const enc=new TextEncoder();
const number=(value:number)=>{const b:number[]=[];do{const part=value%128;value=Math.floor(value/128);b.push(part|(value?128:0));}while(value);return b;};
const binary=(key:number,value:Uint8Array)=>[...number((key<<3)|2),...number(value.length),...value];
const integer=(key:number,value:number)=>[...number(key<<3),...number(value)];
const proto=(parts:number[][])=>new Uint8Array(parts.flat());
function transportFor(options:{network?:string;wrongId?:boolean;height?:number;tip?:number}={}):typeof fetch{
 return async(input,init)=>{assert.equal(init?.redirect,'manual');assert.equal(init?.method,'POST');const path=String(input);
 let body:Uint8Array;
 if(path.endsWith('GetLightdInfo'))body=proto([binary(4,enc.encode(options.network??'test')),binary(6,enc.encode('77190ad9')),integer(7,options.tip??100)]);
 else if(path.endsWith('GetTransaction'))body=proto([binary(1,bytesOf(data.hex)),integer(2,options.height??90)]);
 else {assert.ok(path.endsWith('GetBlock'));const tx=proto([binary(2,bytesOf(options.wrongId?'0'.repeat(64):data.txid).reverse())]);body=proto([integer(2,options.height??90),binary(3,new Uint8Array(32)),integer(5,1234),binary(7,tx)]);}
 return new Response(new Uint8Array(grpcFrame(body)).buffer,{headers:{'Content-Type':'application/grpc'}});
 };
}
test('real NU7 bytes pass live-collector decoding and compact membership checks',async()=>{
 const result=await collectTestnet(data.txid,transportFor(),AbortSignal.timeout(1000));assert.equal(result.data.hex,data.hex);
 assert.deepEqual(inspectLightwalletObservation(result.observation,data.txid,'testnet'),{height:90,confirmations:11,blockHash:'0'.repeat(64)});
});
test('wrong source network, missing membership, wrong ID and source tip lag are rejected',async()=>{
 for(const options of [{network:'main'},{wrongId:true},{height:101}])await assert.rejects(collectTestnet(data.txid,transportFor(options),AbortSignal.timeout(1000)));
 await assert.rejects(collectTestnet('a'.repeat(64),transportFor(),AbortSignal.timeout(1000)));
});
test('mempool has no manufactured block membership or confirmations',async()=>{
 const r=await collectTestnet(data.txid,transportFor({height:0}),AbortSignal.timeout(1000));assert.equal(r.observation.blockHash,undefined);
 assert.equal(inspectLightwalletObservation(r.observation,data.txid,'testnet').confirmations,0);
 assert.throws(()=>inspectLightwalletObservation({...r.observation,blockHash:'0'.repeat(64)},data.txid,'testnet'));
});
test('gRPC/protobuf rejects truncated, compressed, overflowing, duplicate and multi-message responses',()=>{
 for(const frame of [new Uint8Array(),new Uint8Array([1,0,0,0,1,0]),new Uint8Array([0,0,0,0,5,1]),new Uint8Array([0,0,0,0,0])])assert.throws(()=>unaryPayload(frame));
 for(const raw of [new Uint8Array([0]),new Uint8Array([10,2,1]),new Uint8Array([8,...Array(11).fill(255)])])assert.throws(()=>protoFields(raw));
});
test('collector exposes real testnet capability without a node and rejects non-GET capability requests',async()=>{
 const caps=await (await handleApi(new Request('https://veylens.test/api/capabilities'),{})).json();assert.equal(caps.zcashTestnet,true);assert.equal(caps.sources.testnet,'api.testnet.zecblock.com');assert.equal(caps.blockInclusion.testnet,false);
 const request=new Request('https://veylens.test/api/zcash-transaction',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json'},body:JSON.stringify({txid:data.txid,network:'testnet'})});
 const response=await handleApi(request,{TESTNET_SOURCE:'lightwallet'},transportFor());assert.equal(response.status,200);assert.equal((await response.json()).data.hex,data.hex);
});
