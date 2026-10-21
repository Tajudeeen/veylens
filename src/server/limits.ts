import type {D1Database} from '@cloudflare/workers-types';
import {gatewayReady,requestBudget,type GatewayEnv} from './budgetGateway.js';
export interface LimitEnv extends GatewayEnv {DB?:D1Database;COLLECTOR_RATE_SECRET?:string}
export const CLIENT_BUDGET=120,GLOBAL_BUDGET=1200;
export const RESERVE_SQL='INSERT INTO collection_budgets (key, used, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET used = collection_budgets.used + excluded.used WHERE collection_budgets.used + excluded.used <= ? RETURNING used';
export const CLEAN_SQL='DELETE FROM collection_budgets WHERE expires_at < ?';
export function rateLimitReady(env:LimitEnv):boolean{return (!!env.DB||gatewayReady(env))&&typeof env.COLLECTOR_RATE_SECRET==='string'&&env.COLLECTOR_RATE_SECRET.length>=32;}
export async function rateIdentity(ip:string,window:number,secret:string):Promise<string>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`veylens-rate/1:${window}:${ip}`)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
const failure=(message:string,status:number,retry=60)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store','Retry-After':String(retry),'X-Content-Type-Options':'nosniff'}});
/** Each conditional write is atomic. A global denial can still consume a client unit. */
export async function reserveBudgets(db:D1Database,identity:string,window:number,cost:number,now:number):Promise<boolean>{
 const expires=(window+10)*60;
 const reserve=async(key:string,limit:number)=>db.prepare(RESERVE_SQL).bind(key,cost,expires,limit).first<{used:number}>();
 if(!await reserve(identity,CLIENT_BUDGET)||!await reserve(`global:${window}`,GLOBAL_BUDGET))return false;
 await db.prepare(CLEAN_SQL).bind(Math.floor(now/1000)).run();
 return true;
}
/** D1 conditional writes are atomic across isolates. Missing protection fails closed. */
export async function limitCollection(request:Request,env:LimitEnv,cost:number,now=Date.now(),budgetTransport:typeof fetch=fetch):Promise<Response|null>{
 if(!Number.isSafeInteger(cost)||cost<1||cost>5)return failure('Invalid collection budget.',503);
 if(!rateLimitReady(env))return failure('Collection protection is not configured. Local imports remain available.',503);
 const ip=request.headers.get('CF-Connecting-IP');if(!ip||ip.length>64)return failure('Collection client identity is unavailable. Local imports remain available.',503);
 const window=Math.floor(now/60000),retry=60-Math.floor(now/1000)%60;
 try{
  const identity=await rateIdentity(ip,window,env.COLLECTOR_RATE_SECRET!);
  const allowed=env.DB?await reserveBudgets(env.DB,identity,window,cost,now):await requestBudget(env,{identity,window,cost},budgetTransport);
  if(!allowed)return failure('Collection limit reached. Wait before trying again.',429,retry);
  return null;
 }catch{return failure('Collection protection is temporarily unavailable. Local imports remain available.',503);}
}
export type CollectionGuard=(request:Request,env:LimitEnv,cost:number)=>Promise<Response|null>;
