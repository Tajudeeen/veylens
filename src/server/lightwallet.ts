import {decodeZcashTransaction,bytesOf,hexOf} from '../zcash.js';
import {boundedBytes} from './http.js';

// Minimal, bounded codec for the four unary methods used here. Unknown protobuf fields are skipped.
// Field numbers follow zcash/lightwallet-protocol walletrpc/{service,compact_formats}.proto.
type Field={number:number;value:bigint|Uint8Array};
export function protoFields(bytes:Uint8Array):Field[]{
  let pos=0;const fields:Field[]=[];
  function varint():bigint{let n=0n;for(let i=0;i<10;i++){if(pos>=bytes.length)throw new Error('Truncated protobuf.');const b=bytes[pos++]!;if(i===9&&b>1)throw new Error('Oversized protobuf varint.');n|=BigInt(b&127)<<BigInt(i*7);if(!(b&128))return n;}throw new Error('Oversized protobuf varint.');}
  while(pos<bytes.length){if(fields.length>=100_000)throw new Error('Oversized protobuf field list.');const tag=varint(),number=Number(tag>>3n),wire=Number(tag&7n);if(!number||number>536870911)throw new Error('Invalid protobuf tag.');
    if(wire===0)fields.push({number,value:varint()});
    else if(wire===2){const length=Number(varint());if(!Number.isSafeInteger(length)||length<0||length>bytes.length-pos)throw new Error('Truncated protobuf field.');fields.push({number,value:bytes.slice(pos,pos+length)});pos+=length;}
    else if(wire===1||wire===5){pos+=wire===1?8:4;if(pos>bytes.length)throw new Error('Truncated protobuf field.');}
    else throw new Error('Unsupported protobuf wire type.');
  }return fields;
}
const blob=(fields:Field[],number:number)=>{const found=fields.filter(f=>f.number===number);if(found.length>1)throw new Error('Duplicate singular protobuf field.');const value=found[0]?.value;if(value!==undefined&&!(value instanceof Uint8Array))throw new Error('Wrong protobuf field type.');return value??new Uint8Array();};
const uint=(fields:Field[],number:number)=>{const found=fields.filter(f=>f.number===number);if(found.length>1)throw new Error('Duplicate singular protobuf field.');const value=found[0]?.value??0n;if(typeof value!=='bigint'||value>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Unsupported protobuf height or fork sentinel.');return Number(value);};
const text=(fields:Field[],number:number)=>new TextDecoder('utf-8',{fatal:true}).decode(blob(fields,number));
const varint=(n:number)=>{const b:number[]=[];do{const v=n%128;n=Math.floor(n/128);b.push(v|(n?128:0));}while(n);return b;};
export function grpcFrame(payload:Uint8Array):Uint8Array{const frame=new Uint8Array(payload.length+5);new DataView(frame.buffer).setUint32(1,payload.length);frame.set(payload,5);return frame;}
export function unaryPayload(frame:Uint8Array):Uint8Array {
  if(frame.length<5||frame[0]!==0)throw new Error('Unsupported compressed or malformed gRPC response.');
  const size=new DataView(frame.buffer,frame.byteOffset).getUint32(1);if(size===0||size+5!==frame.length)throw new Error('Invalid unary gRPC frame.');return frame.slice(5);
}
export interface LightwalletObservation {
  format:'veylens-lightwallet-observation/1';network:'testnet';txid:string;source:'testnet.zec.rocks';
  reportedHeight:number;sourceTipHeight:number;branchId:string;blockHash?:string;blockTime?:number;
  compactTxids?:string[];
}
export async function collectTestnet(txid:string,transport:typeof fetch,signal:AbortSignal):Promise<{data:{txid:string;hex:string};observation:LightwalletObservation}> {
  async function rpc(method:'GetLightdInfo'|'GetTransaction'|'GetBlock',payload:Uint8Array):Promise<Field[]>{
    const response=await transport(`https://testnet.zec.rocks/cash.z.wallet.sdk.rpc.CompactTxStreamer/${method}`,{method:'POST',headers:{'Content-Type':'application/grpc','TE':'trailers'},body:new Uint8Array(grpcFrame(payload)).buffer,signal,redirect:'manual'});
    if(!response.headers.get('content-type')?.startsWith('application/grpc')||(response.headers.has('grpc-status')&&response.headers.get('grpc-status')!=='0'))throw new Error('Source rejected lightwallet request.');
    return protoFields(unaryPayload(await boundedBytes(response,2_000_000)));
  }
  const info=await rpc('GetLightdInfo',new Uint8Array());if(text(info,4)!=='test')throw new Error('Source returned the wrong network.');
  const branchId=text(info,6);if(!/^[a-f0-9]{8}$/.test(branchId))throw new Error('Source omitted consensus branch.');
  const sourceTipHeight=uint(info,7);if(!sourceTipHeight)throw new Error('Source omitted chain tip.');
  const transaction=await rpc('GetTransaction',new Uint8Array([26,32,...bytesOf(txid).reverse()]));
  const hex=hexOf(blob(transaction,1));if(decodeZcashTransaction(hex,'testnet').txid!==txid)throw new Error('Source transaction ID mismatch.');
  const reportedHeight=uint(transaction,2);
  const observation:LightwalletObservation={format:'veylens-lightwallet-observation/1',network:'testnet',txid,source:'testnet.zec.rocks',reportedHeight,sourceTipHeight,branchId};
  if(reportedHeight>sourceTipHeight)throw new Error('Source tip is behind this transaction. Retry later.');
  if(reportedHeight){
    const block=await rpc('GetBlock',new Uint8Array([8,...varint(reportedHeight)]));if(uint(block,2)!==reportedHeight)throw new Error('Source block height mismatch.');
    const blockHash=blob(block,3);if(blockHash.length!==32)throw new Error('Source omitted block hash.');
    const compactTxids=block.filter(f=>f.number===7).map(f=>{if(!(f.value instanceof Uint8Array))throw new Error('Malformed compact transaction.');const id=blob(protoFields(f.value),2);if(id.length!==32)throw new Error('Malformed compact transaction ID.');return hexOf(id.reverse());});
    if(!compactTxids.includes(txid)||new Set(compactTxids).size!==compactTxids.length)throw new Error('Transaction absent or duplicated in source compact block.');
    observation.blockHash=hexOf(blockHash.reverse());observation.blockTime=uint(block,5);observation.compactTxids=compactTxids;
  }
  return {data:{txid,hex},observation};
}
