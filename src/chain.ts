import {sha256} from '@noble/hashes/sha256';
import {bytesOf,hexOf,type ZcashNetwork} from './zcash.js';

const isObject=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const isHash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const integer=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
const internal=(s:string)=>bytesOf(s).reverse();
const display=(b:Uint8Array)=>hexOf(b.slice().reverse());
const hashPair=(a:Uint8Array,b:Uint8Array)=>sha256(sha256(new Uint8Array([...a,...b])));

export interface BlockInclusion {
  format:'veylens-block-inclusion/1'; network:ZcashNetwork; txid:string;
  headerHex:string; blockHash:string; height:number;
  transactionCount:number; transactionIndex:number; siblings:string[];
  // This is an observation by a source, not a locally verified consensus tip.
  canonicalBlockHash:string; tipHash:string; tipHeight:number;
}

/** Verifies serialized-header hashing and the transaction Merkle path. Does not validate Equihash or consensus. */
export function verifyBlockInclusion(raw:unknown,txid:string,network:ZcashNetwork):{blockHash:string;height:number;confirmations:number} {
  if(!isObject(raw)||raw['format']!=='veylens-block-inclusion/1'||raw['network']!==network||raw['txid']!==txid||
    !isHash(raw['blockHash'])||!isHash(raw['canonicalBlockHash'])||!isHash(raw['tipHash'])||typeof raw['headerHex']!=='string'||
    !integer(raw['height'])||raw['height']===0||!integer(raw['tipHeight'])||raw['tipHeight']<raw['height']||
    !integer(raw['transactionCount'])||raw['transactionCount']<1||raw['transactionCount']>100_000||
    !integer(raw['transactionIndex'])||raw['transactionIndex']>=raw['transactionCount']||
    !Array.isArray(raw['siblings'])||raw['siblings'].length>17||!raw['siblings'].every(isHash)) throw new Error('Invalid block inclusion record or network/transaction binding.');
  const header=bytesOf(raw['headerHex']);
  // Mainnet/testnet Equihash (200,9) headers: 140 fixed bytes, CompactSize 1344, solution.
  if(header.length!==1487||new DataView(header.buffer,header.byteOffset).getInt32(0,true)!==4||hexOf(header.slice(140,143))!=='fd4005')throw new Error('Unsupported or malformed Zcash block header.');
  const blockHash=display(sha256(sha256(header)));
  if(blockHash!==raw['blockHash']||raw['canonicalBlockHash']!==blockHash)throw new Error('Block header hash or source canonical-block binding mismatch.');
  let node=internal(txid),index=raw['transactionIndex'],width=raw['transactionCount'],level=0;
  while(width>1){
    const sibling=raw['siblings'][level++];if(!isHash(sibling))throw new Error('Truncated Merkle path.');
    const other=internal(sibling),equal=hexOf(node)===hexOf(other),oddTail=width%2===1&&index===width-1;
    if(oddTail?!equal:equal)throw new Error('Invalid duplicated Merkle node.');
    node=index%2===0?hashPair(node,other):hashPair(other,node);
    index=Math.floor(index/2);width=Math.ceil(width/2);
  }
  if(level!==raw['siblings'].length||hexOf(node)!==hexOf(header.slice(36,68)))throw new Error('Transaction Merkle path does not match the block header.');
  if(raw['tipHeight']===raw['height']&&raw['tipHash']!==blockHash)throw new Error('Source tip conflicts with inclusion block.');
  return {blockHash,height:raw['height'],confirmations:raw['tipHeight']-raw['height']+1};
}

/** Builds the portable proof from a full node's ordered transaction IDs. Root and header are rechecked locally. */
export function buildBlockInclusion(input:Omit<BlockInclusion,'format'|'transactionCount'|'transactionIndex'|'siblings'>,txids:string[]):BlockInclusion {
  if(!txids.length||txids.length>100_000||txids.some(t=>!isHash(t))||new Set(txids).size!==txids.length)throw new Error('Invalid or duplicate block transaction IDs.');
  let index=txids.indexOf(input.txid);if(index<0)throw new Error('Transaction absent from reported block.');
  const transactionIndex=index,siblings:string[]=[];let layer=txids.map(internal);
  while(layer.length>1){
    siblings.push(display(layer[index^1]??layer[index]!));
    const next:Uint8Array[]=[];for(let i=0;i<layer.length;i+=2)next.push(hashPair(layer[i]!,layer[i+1]??layer[i]!));
    layer=next;index=Math.floor(index/2);
  }
  const proof:BlockInclusion={format:'veylens-block-inclusion/1',...input,transactionCount:txids.length,transactionIndex,siblings};
  verifyBlockInclusion(proof,input.txid,input.network);return proof;
}
