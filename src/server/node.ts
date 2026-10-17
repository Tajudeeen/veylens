import {buildBlockInclusion} from '../chain.js';
import type {ZcashNetwork} from '../zcash.js';
import {boundedJson} from './http.js';
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export interface NodeConnection {url:string;auth?:string}
export async function nodeRpc(node:NodeConnection,method:string,params:unknown[],transport:typeof fetch,signal:AbortSignal):Promise<unknown>{
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
