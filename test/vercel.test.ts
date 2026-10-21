import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {budgetDb} from './helpers/budgetDb.js';
import {handleBudget} from '../src/server/budgetWorker.js';
import {BUDGET_PROTOCOL,signBudget,requestBudget,gatewayReady} from '../src/server/budgetGateway.js';
import {handleVercelApi,vercelEnvironment} from '../src/server/vercel.js';
import {rateLimitReady,rateIdentity} from '../src/server/limits.js';
const secret='test-only-budget-gateway-secret-value';
const salt='test-only-client-window-identity-salt';
const now=600_000;
const env={BUDGET_GATEWAY_URL:'https://budget.test/admit',BUDGET_GATEWAY_SECRET:secret};
function db(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_slim_fixer.sql','utf8'));return {sql,DB:budgetDb(sql)};}
async function signed(input:unknown,signingSecret=secret){const body=JSON.stringify(input);return new Request(env.BUDGET_GATEWAY_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Veylens-Budget-Signature':await signBudget(body,signingSecret)},body});}
test('authenticated budget gateway preserves shared weighted limits using real SQLite',async()=>{
 const {sql,DB}=db();try{
  const identity=await rateIdentity('192.0.2.9',10,salt);
  const transport:typeof fetch=async(input,init)=>handleBudget(new Request(input,init),{DB,BUDGET_GATEWAY_SECRET:secret},now);
  for(let i=0;i<24;i++)assert.equal(await requestBudget(env,{identity,window:10,cost:5},transport),true);
  assert.equal(await requestBudget(env,{identity,window:10,cost:5},transport),false);
  assert.equal(sql.prepare('SELECT used FROM collection_budgets WHERE key=?').get(identity)!.used,120);
  assert.equal(sql.prepare('SELECT used FROM collection_budgets WHERE key=?').get('global:10')!.used,120);
  const next=await signed({identity:await rateIdentity('192.0.2.9',11,salt),window:11,cost:1});
  assert.deepEqual(await (await handleBudget(next,{DB,BUDGET_GATEWAY_SECRET:secret},660_000)).json(),{protocol:BUDGET_PROTOCOL,allowed:true});
 }finally{sql.close();}
});
test('gateway rejects forged authentication, stale windows, arbitrary fields and excessive bodies without writes',async()=>{
 const {sql,DB}=db();const runtime={DB,BUDGET_GATEWAY_SECRET:secret};const input={identity:'a'.repeat(64),window:10,cost:1};
 try{
  assert.equal((await handleBudget(await signed(input,'a'.repeat(32)),runtime,now)).status,401);
  for(const invalid of [{...input,window:9},{...input,cost:0},{...input,cost:6},{...input,cost:1.5},{...input,identity:'192.0.2.9'},{...input,sql:'DELETE FROM collection_budgets'}])assert.equal((await handleBudget(await signed(invalid),runtime,now)).status,400);
  assert.equal((await handleBudget(await signed({...input,extra:'a'.repeat(400)}),runtime,now)).status,503);
  assert.equal((await handleBudget(new Request('https://budget.test/admit'),runtime,now)).status,404);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM collection_budgets').get()!.n,0);
 }finally{sql.close();}
});
test('gateway rejects global overuse and fails closed on storage and transport failure',async()=>{
 const {sql,DB}=db();const input={identity:'a'.repeat(64),window:10,cost:1};
 sql.prepare('INSERT INTO collection_budgets VALUES (?,?,?)').run('global:10',1200,1200);
 assert.equal((await (await handleBudget(await signed(input),{DB,BUDGET_GATEWAY_SECRET:secret},now)).json() as {allowed:boolean}).allowed,false);
 sql.close();assert.equal((await handleBudget(await signed(input),{DB,BUDGET_GATEWAY_SECRET:secret},now)).status,503);
 for(const bad of [new Response('Moved',{status:302}),Response.json({allowed:true}),Response.json({protocol:BUDGET_PROTOCOL,allowed:'true'}),new Response('x'.repeat(600))])await assert.rejects(()=>requestBudget(env,input,async()=>bad));
 await assert.rejects(()=>requestBudget(env,input,async()=>{throw new Error('Offline');}));
 for(const raw of ['http://budget.test/admit','https://user:pass@budget.test/admit','https://budget.test/admit?secret=bad','https://budget.test/other'])assert.equal(gatewayReady({...env,BUDGET_GATEWAY_URL:raw}),false);
 assert.equal(rateLimitReady({...env,COLLECTOR_RATE_SECRET:salt}),true);
});
test('Vercel removes spoofed Cloudflare identity and trusts only its overwritten single IP header',async()=>{
 const make=(headers:Record<string,string>)=>new Request('https://veylens.test/api/source-health',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json',...headers},body:JSON.stringify({network:'testnet'})});
 const configured={VERCEL:'1',...env,COLLECTOR_RATE_SECRET:salt};
 for(const [headers,runtime] of [[{'CF-Connecting-IP':'192.0.2.5'},configured],[{'X-Forwarded-For':'192.0.2.5, 192.0.2.6'},configured],[{'X-Forwarded-For':'192.0.2.5'},{...configured,VERCEL:'0'}]] as const){
  const result=await handleVercelApi(make(headers),runtime);assert.equal(result.status,503);assert.match(await result.text(),/identity/);
 }
 assert.deepEqual(vercelEnvironment({VERCEL:'1',UNRELATED_SECRET:'do-not-forward',COLLECTOR_KEY_ID:'test'}),{COLLECTOR_KEY_ID:'test'});
 const capabilities=await handleVercelApi(new Request('https://veylens.test/api/capabilities'),{});assert.equal(capabilities.status,200);
 const blocked=await handleVercelApi(make({'X-Forwarded-For':'192.0.2.5'}),{VERCEL:'1'});assert.equal(blocked.status,503);
});
test('Vercel API reaches persistent gateway admission and consumes no raw identity or evidence',async()=>{
 const {sql,DB}=db();const runtime={VERCEL:'1',...env,COLLECTOR_RATE_SECRET:salt};let observed='';
 const gateway:typeof fetch=async(input,init)=>{const req=new Request(input,init);observed=await req.clone().text();return handleBudget(req,{DB,BUDGET_GATEWAY_SECRET:secret});};
 const make=(origin='https://veylens.test')=>new Request('https://veylens.test/api/source-health',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Forwarded-For':'192.0.2.9','CF-Connecting-IP':'198.51.100.1'},body:JSON.stringify({network:'testnet'})});
 try{
  const response=await handleVercelApi(make(),runtime,fetch,gateway);assert.equal(response.status,200);assert.equal((await response.json() as {status:string}).status,'not-configured');assert.ok(!observed.includes('192.0.2.9'));assert.ok(!observed.includes('198.51.100.1'));assert.ok(!observed.includes('testnet'));
  const row=JSON.parse(observed) as {identity:string;window:number;cost:number};assert.equal(row.identity,await rateIdentity('192.0.2.9',row.window,salt));assert.equal(row.cost,2);
  assert.equal(sql.prepare('SELECT used FROM collection_budgets WHERE key=?').get(row.identity)!.used,2);
  const foreign=await handleVercelApi(make('https://foreign.test'),runtime,fetch,async()=>{throw new Error('Must not reach gateway');});assert.equal(foreign.status,403);
  const down=await handleVercelApi(make(),runtime,fetch,async()=>{throw new Error('Down');});assert.equal(down.status,503);
 }finally{sql.close();}
});
