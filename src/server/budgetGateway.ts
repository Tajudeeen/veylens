import {boundedJson} from './http.js';
export interface GatewayEnv {BUDGET_GATEWAY_URL?:string;BUDGET_GATEWAY_SECRET?:string}
export interface BudgetRequest {identity:string;window:number;cost:number}
export const BUDGET_PROTOCOL='veylens-budget/1';
function endpoint(raw:string|undefined):URL|undefined{
 try{const url=new URL(raw!);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/admit')return url;}catch{}
 return undefined;
}
export function gatewayReady(env:GatewayEnv):boolean{return !!endpoint(env.BUDGET_GATEWAY_URL)&&typeof env.BUDGET_GATEWAY_SECRET==='string'&&env.BUDGET_GATEWAY_SECRET.length>=32;}
const bytes=(value:string)=>new TextEncoder().encode(value);
async function key(secret:string,usage:'sign'|'verify'){return crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,[usage]);}
export async function signBudget(body:string,secret:string):Promise<string>{
 const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret,'sign'),bytes(`${BUDGET_PROTOCOL}\n${body}`)));
 return Array.from(signature,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyBudget(body:string,signature:string,secret:string):Promise<boolean>{
 if(!/^[a-f0-9]{64}$/.test(signature)||secret.length<32)return false;
 return crypto.subtle.verify('HMAC',await key(secret,'verify'),Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16)),bytes(`${BUDGET_PROTOCOL}\n${body}`));
}
/** Vercel sends a per-window HMAC digest, never the raw client IP or case data. */
export async function requestBudget(env:GatewayEnv,input:BudgetRequest,transport:typeof fetch=fetch):Promise<boolean>{
 const url=endpoint(env.BUDGET_GATEWAY_URL);if(!url||!gatewayReady(env))throw new Error('Budget gateway is unavailable.');
 const body=JSON.stringify(input);
 const response=await transport(url,{method:'POST',headers:{'Content-Type':'application/json','X-Veylens-Budget-Signature':await signBudget(body,env.BUDGET_GATEWAY_SECRET!)},body,redirect:'error',signal:AbortSignal.timeout(5000)});
 const result=await boundedJson(response,512);
 if(!result||typeof result!=='object'||!('protocol' in result)||result.protocol!==BUDGET_PROTOCOL||!('allowed' in result)||typeof result.allowed!=='boolean')throw new Error('Invalid budget response.');
 return result.allowed;
}
