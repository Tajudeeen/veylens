import {stableMetadata} from './canonical.js';
export const COLLECTOR_PUBLIC_KEY='MCowBQYDK2VwAyEAmQK6omun4anoQSVCqlV2F8A6g/UyQ9EtnsHL3owGSEs=';
export interface CollectionReceipt {format:'veylens-collection/1';source:'oneclick-status'|'zcash-explorer'|'configured-node'|'testnet-lightwallet'|'testnet-lightwallet-observation'|'configured-node-inclusion'|'testnet-explorer'|'testnet-explorer-observation';observedAt:string;request:Record<string,string>;dataDigest:string;signature:string}
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64=(b:Uint8Array)=>btoa(Array.from(b,c=>String.fromCharCode(c)).join(''));
async function hash(data:unknown):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableMetadata(data)))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function signCollection(data:unknown,source:CollectionReceipt['source'],request:Record<string,string>,key:string):Promise<CollectionReceipt>{
 const payload={format:'veylens-collection/1' as const,source,observedAt:new Date().toISOString(),request,dataDigest:await hash(data)};
 const privateKey=await crypto.subtle.importKey('pkcs8',bytes(key),'Ed25519',false,['sign']);
 const signature=b64(new Uint8Array(await crypto.subtle.sign('Ed25519',privateKey,new TextEncoder().encode(stableMetadata(payload)))));return {...payload,signature};
}
export async function verifyCollection(data:unknown,raw:unknown,source:CollectionReceipt['source'],request:Record<string,string>):Promise<boolean>{
 try{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;const r=raw as CollectionReceipt;
  if(r.format!=='veylens-collection/1'||r.source!==source||stableMetadata(r.request)!==stableMetadata(request)||typeof r.observedAt!=='string'||!Number.isFinite(Date.parse(r.observedAt))||r.dataDigest!==await hash(data))return false;
  const {signature,...payload}=r;const key=await crypto.subtle.importKey('spki',bytes(COLLECTOR_PUBLIC_KEY),'Ed25519',false,['verify']);return crypto.subtle.verify('Ed25519',key,bytes(signature),new TextEncoder().encode(stableMetadata(payload)));
 }catch{return false;}
}
