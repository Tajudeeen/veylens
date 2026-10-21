import {stableMetadata} from './canonical.js';
import {COLLECTOR_KEYS,LEGACY_COLLECTOR_KEY_ID,trustedCollectorKey,type CollectorKey} from './collectorKeys.js';
export const COLLECTOR_PUBLIC_KEY=COLLECTOR_KEYS[LEGACY_COLLECTOR_KEY_ID]!.publicKey;
export interface CollectionReceipt {format:'veylens-collection/1'|'veylens-collection/2';keyId?:string;source:'oneclick-status'|'zcash-explorer'|'configured-node'|'testnet-lightwallet'|'testnet-lightwallet-observation'|'configured-node-inclusion'|'testnet-explorer'|'testnet-explorer-observation';observedAt:string;request:Record<string,string>;dataDigest:string;signature:string}
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64=(b:Uint8Array)=>btoa(Array.from(b,c=>String.fromCharCode(c)).join(''));
async function hash(data:unknown):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableMetadata(data)))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function signCollection(data:unknown,source:CollectionReceipt['source'],request:Record<string,string>,key:string,keyId?:string):Promise<CollectionReceipt>{
 const payload={format:keyId?'veylens-collection/2' as const:'veylens-collection/1' as const,...(keyId?{keyId}:{}),source,observedAt:new Date().toISOString(),request,dataDigest:await hash(data)};
 const privateKey=await crypto.subtle.importKey('pkcs8',bytes(key),'Ed25519',false,['sign']);
 const signature=b64(new Uint8Array(await crypto.subtle.sign('Ed25519',privateKey,new TextEncoder().encode(stableMetadata(payload)))));return {...payload,signature};
}
/** Optional registry exists for deterministic tests and embedding an explicitly trusted policy. Receipts never choose it. */
export async function verifyCollection(data:unknown,raw:unknown,source:CollectionReceipt['source'],request:Record<string,string>,keys:Readonly<Record<string,CollectorKey>>=COLLECTOR_KEYS):Promise<boolean>{
 try{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;const r=raw as CollectionReceipt;
  if((r.format!=='veylens-collection/1'&&r.format!=='veylens-collection/2')||r.source!==source||stableMetadata(r.request)!==stableMetadata(request)||typeof r.observedAt!=='string'||r.dataDigest!==await hash(data))return false;
  if(r.format==='veylens-collection/1'&&r.keyId!==undefined)return false;
  const id=r.format==='veylens-collection/1'?LEGACY_COLLECTOR_KEY_ID:r.keyId;if(typeof id!=='string')return false;
  const trusted=trustedCollectorKey(id,r.observedAt,keys);if(!trusted)return false;
  const {signature,...payload}=r;const key=await crypto.subtle.importKey('spki',bytes(trusted.publicKey),'Ed25519',false,['verify']);return crypto.subtle.verify('Ed25519',key,bytes(signature),new TextEncoder().encode(stableMetadata(payload)));
 }catch{return false;}
}
/** Validate the configured signer before signing observations with its pinned key ID. */
export async function checkCollectorSigner(privateKey:string,keyId:string):Promise<boolean>{
 try{if(!Object.hasOwn(COLLECTOR_KEYS,keyId)||COLLECTOR_KEYS[keyId]!.status!=='active')return false;const data={purpose:'veylens-signer-self-check/1'};const r=await signCollection(data,'configured-node',{},privateKey,keyId);return await verifyCollection(data,r,'configured-node',{});}catch{return false;}
}
