import {bech32,bech32m,base58} from '@scure/base';
import {blake2b} from '@noble/hashes/blake2';
import {sha256} from '@noble/hashes/sha256';
import {validTransparentAddress,hexOf, type ZcashNetwork} from './zcash.js';
const ascii=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
const join=(a:Uint8Array,b:Uint8Array):Uint8Array=>{const out=new Uint8Array(a.length+b.length);out.set(a);out.set(b,a.length);return out;};
function inverseJumble(data:Uint8Array):Uint8Array{
 if(data.length<48||data.length>8192)throw new Error('Unified encoding exceeds supported size or is truncated.');
 const l=Math.min(64,Math.floor(data.length/2));let left:Uint8Array=data.slice(0,l),right:Uint8Array=data.slice(l);
 const xor=(a:Uint8Array,b:Uint8Array):Uint8Array=>Uint8Array.from(a,(v,i)=>v^b[i]!);
 const H=(i:number,b:Uint8Array)=>blake2b(b,{dkLen:l,personalization:join(ascii('UA_F4Jumble_H'),Uint8Array.from([i,0,0]))});
 const G=(i:number,b:Uint8Array)=>{const out=new Uint8Array(right.length);for(let j=0;j*64<out.length;j++){const block=blake2b(b,{dkLen:64,personalization:join(ascii('UA_F4Jumble_G'),Uint8Array.from([i,j&255,j>>>8]))});out.set(block.slice(0,Math.min(64,out.length-j*64)),j*64);}return out;};
 left=xor(left,H(1,right));right=xor(right,G(1,left));left=xor(left,H(0,right));right=xor(right,G(0,left));return join(left,right);
}
export interface ReceiverInspection {encoding:'transparent'|'sapling'|'unified';network:ZcashNetwork;receivers:Array<{typecode:number;kind:string;payloadHex:string;transparentAddress?:string}>;limitations:string[];}
export function inspectReceiver(address:string,network:ZcashNetwork):ReceiverInspection{
 if(address.length>14000)throw new Error('Address encoding is too large.');
 const limits=['Receiver encoding does not prove which receiver was used by a transaction.','Shielded receiver curve points and wallet ownership are not validated.'];
 if(validTransparentAddress(address,network))return {encoding:'transparent',network,receivers:[{typecode:address.startsWith('t3')||address.startsWith('t2')?1:0,kind:'transparent',payloadHex:hexOf(base58.decode(address).slice(2,-4)),transparentAddress:address}],limitations:limits};
 if(address.startsWith('zs')||address.startsWith('ztestsapling')){
  const decoded=bech32.decode(address as `${string}1${string}`,14000);const want=network==='mainnet'?'zs':'ztestsapling';
  if(decoded.prefix!==want)throw new Error('Sapling address network mismatch.');const b=bech32.fromWords(decoded.words);if(b.length!==43)throw new Error('Invalid Sapling receiver length.');
  return {encoding:'sapling',network,receivers:[{typecode:2,kind:'sapling',payloadHex:hexOf(b)}],limitations:limits};
 }
 const decoded=bech32m.decode(address as `${string}1${string}`,14000);const prefix=network==='mainnet'?'u':'utest';
 if(decoded.prefix!==prefix)throw new Error('Unsupported Unified Address revision or network mismatch.');
 const raw=inverseJumble(bech32m.fromWords(decoded.words));const padding=new Uint8Array(16);padding.set(ascii(prefix));
 if(hexOf(raw.slice(-16))!==hexOf(padding))throw new Error('Unified Address padding mismatch.');
 const bytes=raw.slice(0,-16);let offset=0,last=-1;const receivers:ReceiverInspection['receivers']=[];
 const compact=():number=>{if(offset>=bytes.length)throw new Error('Truncated receiver item.');const tag=bytes[offset++]!;if(tag<253)return tag;const n=tag===253?2:tag===254?4:8;if(offset+n>bytes.length)throw new Error('Truncated item integer.');let value=0n;for(let i=0;i<n;i++)value+=BigInt(bytes[offset++]!)<<(8n*BigInt(i));if(value<(tag===253?253n:tag===254?65536n:4294967296n)||value>0x2000000n)throw new Error('Invalid item integer.');return Number(value);};
 while(offset<bytes.length){const type=compact(),length=compact();if(type<=last||offset+length>bytes.length)throw new Error('Duplicate, out-of-order or truncated receiver item.');last=type;
  const payload=bytes.slice(offset,offset+length);offset+=length;
  const expected=type<2?20:type<4?43:undefined;if(expected!==undefined&&length!==expected)throw new Error('Receiver length mismatch.');
  const row:ReceiverInspection['receivers'][number]={typecode:type,kind:['p2pkh','p2sh','sapling','orchard'][type]??'unknown',payloadHex:hexOf(payload)};
  if(type<2){const prefixBytes=network==='mainnet'?(type===0?[0x1c,0xb8]:[0x1c,0xbd]):(type===0?[0x1d,0x25]:[0x1c,0xba]);const body=join(Uint8Array.from(prefixBytes),payload);row.transparentAddress=base58.encode(join(body,sha256(sha256(body)).slice(0,4)));}receivers.push(row);
 }
 if(receivers.some(r=>r.typecode===0)&&receivers.some(r=>r.typecode===1))throw new Error('Both transparent receiver types cannot occur together.');
 if(!receivers.some(r=>r.typecode===2||r.typecode===3))throw new Error('Revision 0 requires a recognized shielded receiver.');
 if(receivers.some(r=>r.kind==='unknown'))limits.push('Unknown receiver items are retained; their transfer privacy is not assessed.');
 return {encoding:'unified',network,receivers,limitations:limits};
}
