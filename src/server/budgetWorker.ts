import type {D1Database} from '@cloudflare/workers-types';
import {boundedBytes} from './http.js';
import {reserveBudgets} from './limits.js';
import {BUDGET_PROTOCOL,verifyBudget} from './budgetGateway.js';
type BudgetEnv={DB:D1Database;BUDGET_GATEWAY_SECRET:string};
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
/** Server-to-server admission only. No general SQL, source records, IPs or lookup endpoint. */
export async function handleBudget(request:Request,env:BudgetEnv,now=Date.now()):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname!=='/admit'||url.search||request.method!=='POST')return response({error:'Not found.'},404);
 if(!env.DB||typeof env.BUDGET_GATEWAY_SECRET!=='string'||env.BUDGET_GATEWAY_SECRET.length<32)return response({error:'Unavailable.'},503);
 if(request.headers.get('Content-Type')!=='application/json')return response({error:'JSON required.'},415);
 try{
  const body=new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(new Response(request.body),256));
  if(!await verifyBudget(body,request.headers.get('X-Veylens-Budget-Signature')??'',env.BUDGET_GATEWAY_SECRET))return response({error:'Unauthorized.'},401);
  const input:unknown=JSON.parse(body);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='cost,identity,window'||!('identity' in input)||typeof input.identity!=='string'||!/^[a-f0-9]{64}$/.test(input.identity)||!('cost' in input)||typeof input.cost!=='number'||!Number.isSafeInteger(input.cost)||input.cost<1||input.cost>5||!('window' in input)||input.window!==Math.floor(now/60000))return response({error:'Invalid admission request.'},400);
  const allowed=await reserveBudgets(env.DB,input.identity,input.window,input.cost,now);
  return response({protocol:BUDGET_PROTOCOL,allowed});
 }catch{return response({error:'Unavailable.'},503);}
}
export default {fetch:(request:Request,env:BudgetEnv)=>handleBudget(request,env)};
