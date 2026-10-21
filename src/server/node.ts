import {sha256} from '@noble/hashes/sha256';
import {bytesOf,hexOf} from '../zcash.js';
import {buildBlockInclusion} from '../chain.js';
import type {ZcashNetwork} from '../zcash.js';
import {boundedJson} from './http.js';
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export interface NodeConnection {url:string;auth?:string}
export async function nodeRpc(node:NodeConnection,method:string,params:unknown[],transport:typeof fetch,signal:AbortSignal):Promise<unknown>{
  const endpoint=new URL(node.url);if(endpoint.username||endpoint.password||!['https:','http:'].includes(endpoint.protocol)||endpoint.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))throw new Error('Node endpoint must use HTTPS without URL credentials.');
  const response=await boundedJson(await transport(node.url,{method:'POST',signal,redirect:'manual',headers:{'Content-Type':'application/json',...(node.auth?{Authorization:node.auth}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),8_000_000);
  if(!object(response)||response['error']||response['result']===undefined)throw new Error('Node returned no supported result.');return response['result'];
}
export async function collectInclusion(node:NodeConnection,txid:string,network:ZcashNetwork,transport:typeof fetch,signal:AbortSignal){
  const rpc=(method:string,params:unknown[])=>nodeRpc(node,method,params,transport,signal);
  const transaction=await rpc('getrawtransaction',[txid,1]);
  if(!object(transaction)||!hash(transaction['blockhash']))throw new Error('Node returned no mined block for this transaction.');
  const blockHash=transaction['blockhash'];
  const [block,headerHex,info]=await Promise.all([rpc('getblock',[blockHash,1]),rpc('getblockheader',[blockHash,false]),rpc('getblockchaininfo',[])]);
  if(!object(block)||!Array.isArray(block['tx'])||!block['tx'].every(hash)||!Number.isSafeInteger(block['height'])||typeof headerHex!=='string'||
    !object(info)||info['chain']!==(network==='mainnet'?'main':'test')||!hash(info['bestblockhash'])||!Number.isSafeInteger(info['blocks']))throw new Error('Node returned inconsistent block metadata or network.');
  const height=Number(block['height']),canonicalBlockHash=await rpc('getblockhash',[height]);if(!hash(canonicalBlockHash))throw new Error('Node returned no canonical block hash.');
  return buildBlockInclusion({network,txid,blockHash,headerHex,height,canonicalBlockHash,tipHash:info['bestblockhash'],tipHeight:Number(info['blocks'])},block['tx']);
}

/** Check the configured source without requesting a transaction or wallet record. */
export async function probeNode(node:NodeConnection,network:ZcashNetwork,transport:typeof fetch,signal:AbortSignal){
 const endpoint=new URL(node.url);if(endpoint.username||endpoint.password||!['https:','http:'].includes(endpoint.protocol)||endpoint.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))throw new Error('Node endpoint must use HTTPS without URL credentials.');
 const info=await nodeRpc(node,'getblockchaininfo',[],transport,signal);
 if(!object(info)||info['chain']!==(network==='mainnet'?'main':'test')||!Number.isSafeInteger(info['blocks'])||Number(info['blocks'])<1||!hash(info['bestblockhash'])||info['initialblockdownload']===true||typeof info['verificationprogress']==='number'&&info['verificationprogress']<0.999)throw new Error('Node returned a mismatched network or is still synchronizing.');
 const canonical=await nodeRpc(node,'getblockhash',[info['blocks']],transport,signal);
 if(canonical!==info['bestblockhash'])throw new Error('Node returned an inconsistent tip. Retry after the tip settles.');
 const header=await nodeRpc(node,'getblockheader',[canonical,false],transport,signal);
 if(typeof header!=='string')throw new Error('Node returned no serialized tip header.');
 const raw=bytesOf(header);if(raw.length!==1487||new DataView(raw.buffer,raw.byteOffset).getInt32(0,true)!==4||hexOf(raw.slice(140,143))!=='fd4005'||hexOf(sha256(sha256(raw)).reverse())!==canonical)throw new Error('Node returned an invalid tip header hash.');
 return {status:'checked-node-observation',network,height:Number(info['blocks']),tipHash:canonical,checkedAt:new Date().toISOString(),notice:'Node network, reported tip and serialized header hash checked. Equihash, chain work, consensus and wallet ownership are not independently verified.'};
}
