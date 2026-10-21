import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RESERVE_SQL,CLEAN_SQL,rateIdentity,limitCollection} from '../src/server/limits.js';
import {handleApi} from '../src/server/api.js';
test('persistent SQL budgets enforce an exact shared weighted cap across connections',()=>{
 const dir=mkdtempSync(join(tmpdir(),'veylens-budget-'));const a=new DatabaseSync(join(dir,'limit.sqlite')),b=new DatabaseSync(join(dir,'limit.sqlite'));
 try{a.exec(readFileSync('drizzle/0000_slim_fixer.sql','utf8'));let accepted=0;for(let n=0;n<100;n++){const db=n%2?a:b;if(db.prepare(RESERVE_SQL).get('private-window-digest',4,600,120))accepted++;}assert.equal(accepted,30);assert.equal(a.prepare('SELECT used FROM collection_budgets WHERE key=?').get('private-window-digest')!.used,120);a.prepare(CLEAN_SQL).run(601);assert.equal(a.prepare('SELECT COUNT(*) AS count FROM collection_budgets').get()!.count,0);}finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});
test('rate identities are keyed and change by time window without storing the IP',async()=>{
 const a=await rateIdentity('192.0.2.1',10,'a'.repeat(32)),b=await rateIdentity('192.0.2.1',11,'a'.repeat(32)),c=await rateIdentity('192.0.2.1',10,'b'.repeat(32));assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.notEqual(a,c);assert.ok(!a.includes('192.0.2.1'));
});
test('unprotected collection fails closed and denied requests never reach upstream',async()=>{
 const request=new Request('https://veylens.test/api/zcash-transaction',{method:'POST',headers:{Origin:'https://veylens.test','Content-Type':'application/json'},body:JSON.stringify({txid:'a'.repeat(64),network:'mainnet'})});let calls=0;const transport:typeof fetch=async()=>{calls++;throw new Error('Must not call');};
 const missing=await handleApi(request.clone(),{},transport);assert.equal(missing.status,503);assert.equal(calls,0);
 const denied=await handleApi(request.clone(),{},transport,async()=>new Response('Limited',{status:429,headers:{'Retry-After':'30'}}));assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'30');assert.equal(calls,0);
 const result=await limitCollection(request,{},1);assert.equal(result?.status,503);
});

test('production admission enforces client/global windows and fails closed on database errors',async()=>{
 const {budgetDb}=await import('./helpers/budgetDb.js');const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_slim_fixer.sql','utf8'));const env={DB:budgetDb(sql),COLLECTOR_RATE_SECRET:'test-only-random-looking-salt-value'};
 const request=new Request('https://veylens.test/api/source-health',{headers:{'CF-Connecting-IP':'192.0.2.5'}});
 for(let i=0;i<24;i++)assert.equal(await limitCollection(request,env,5,600_000),null);
 const limited=await limitCollection(request,env,5,600_000);assert.equal(limited?.status,429);assert.equal(limited?.headers.get('Retry-After'),'60');assert.equal(await limitCollection(request,env,5,660_000),null);
 sql.prepare('UPDATE collection_budgets SET used=1200 WHERE key=?').run('global:11');assert.equal((await limitCollection(new Request(request,{headers:{'CF-Connecting-IP':'192.0.2.6'}}),env,1,660_000))?.status,429);
 assert.equal((await limitCollection(new Request('https://veylens.test/api/source-health'),env,1,660_000))?.status,503);
 sql.close();assert.equal((await limitCollection(request,env,1,720_000))?.status,503);
});
