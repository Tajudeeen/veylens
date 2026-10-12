import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
let html='';before(()=>{execFileSync(process.execPath,['dist/src/web/build.js']);html=readFileSync('dist/client/workspace.html','utf8');});
const load=(transport:typeof fetch)=>new JSDOM(html,{url:'https://veylens.test/workspace.html',runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{TextEncoder,fetch:transport,AbortSignal});}});
test('production bundle excludes fixtures and starts with empty evidence',()=>{
 const dom=load(async()=>Response.json({}));assert.equal((dom.window.document.getElementById('flow-input') as HTMLTextAreaElement).value,'');
 assert.equal(dom.window.document.getElementById('load-leak'),null);assert.ok(!html.includes('t1OriginalShieldingSource'));assert.ok(!html.includes('43e966e190f8a63dda0add470e9439b2163f3c89a857488b966d6af2ee716851'));dom.window.close();
});
test('guided collection requires consent and does not substitute data on failure',async()=>{
 let calls=0;const dom=load(async()=>{calls++;return Response.json({error:'Source unavailable.'},{status:400});});const doc=dom.window.document;
 (doc.getElementById('collect') as HTMLButtonElement).click();assert.equal(calls,0);assert.match(doc.getElementById('intake-status')!.textContent!,/Confirm/);
 (doc.getElementById('lookup-consent') as HTMLInputElement).checked=true;(doc.getElementById('collect') as HTMLButtonElement).click();
 await new Promise(r=>setTimeout(r,50));assert.equal(calls,1);assert.match(doc.getElementById('intake-status')!.textContent!,/Source unavailable/);assert.equal((doc.getElementById('flow-input') as HTMLTextAreaElement).value,'');dom.window.close();
});
test('guided real-record import reaches decoding, findings and signing',async()=>{
 const fixture=JSON.parse(readFileSync('test/fixtures/zcash/mainnet-inspection.json','utf8')) as {transactions:Array<{txid:string;hex:string}>};const first=fixture.transactions[0]!;
 const dom=load(async(_input,init)=>{const body=JSON.parse(String(init?.body)) as {txid:string};return body.txid===first.txid?Response.json({data:first}):Response.json({error:'Source unavailable.'},{status:400});});const doc=dom.window.document;
 (doc.getElementById('lookup-id') as HTMLInputElement).value=first.txid;(doc.getElementById('lookup-consent') as HTMLInputElement).checked=true;(doc.getElementById('collect') as HTMLButtonElement).click();
 for(let n=0;n<100&&(doc.getElementById('results') as HTMLElement).hidden;n++)await new Promise(r=>setTimeout(r,20));
 assert.equal((doc.getElementById('results') as HTMLElement).hidden,false);assert.match(doc.getElementById('risk-status')!.textContent!,/Evidence incomplete/);assert.ok((doc.getElementById('r-signed') as HTMLTextAreaElement).value.includes('signature'));dom.window.close();
});
