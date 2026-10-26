/** Public trust policy shipped with the verifier. Never accept keys supplied by a receipt. */
export interface CollectorKey {publicKey:string;status:'active'|'retired'|'revoked';notBefore:string;notAfter?:string}
export const LEGACY_COLLECTOR_KEY_ID='veylens-2026-10';
export const COLLECTOR_KEYS:Readonly<Record<string,CollectorKey>>=Object.freeze({
 [LEGACY_COLLECTOR_KEY_ID]:Object.freeze({publicKey:'MCowBQYDK2VwAyEAmQK6omun4anoQSVCqlV2F8A6g/UyQ9EtnsHL3owGSEs=',status:'active',notBefore:'2026-10-01T00:00:00Z'}),
 'veylens-vercel-2026-10':Object.freeze({publicKey:'MCowBQYDK2VwAyEAQAW5mh0w8kM4T3uc5ZnFfE2l7jlDAHDiby0CFAQ62ss=',status:'active',notBefore:'2026-10-26T06:36:59.415Z'}),
});
export function trustedCollectorKey(id:string,observedAt:string,keys:Readonly<Record<string,CollectorKey>>=COLLECTOR_KEYS):CollectorKey|undefined{
 const key=Object.hasOwn(keys,id)?keys[id]:undefined;const time=Date.parse(observedAt);
 if(!key||key.status==='revoked'||!Number.isFinite(time)||time<Date.parse(key.notBefore)||(key.notAfter!==undefined&&time>Date.parse(key.notAfter)))return undefined;
 return key;
}
