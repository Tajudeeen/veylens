import {controlledCase} from './helpers/case.js';
import {checkSourceRecord} from '../src/evidence.js';
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
let html='';before(()=>{execFileSync(process.execPath,['dist/src/web/build.js']);html=readFileSync('dist/client/workspace.html','utf8');});
test('real NU7 case imports in the workspace and replays the source-bound report without network calls',async()=>{
 const input=JSON.parse(readFileSync('examples/testnet-refund/vulnerable.case.json','utf8'));
 let calls=0;const dom=load(async()=>{calls++;throw new Error('Unexpected network call');});const doc=dom.window.document;
 const text=JSON.stringify(input);const file={size:text.length,text:async()=>text};
 Object.defineProperty(doc.getElementById('case-file'),'files',{value:[file],configurable:true});doc.getElementById('case-file')!.dispatchEvent(new dom.window.Event('change'));
 for(let n=0;n<200&&!(doc.getElementById('r-signed') as HTMLTextAreaElement).value;n++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.match(doc.getElementById('r-verdict')!.textContent!,/High risk/);
 const signed=JSON.parse((doc.getElementById('r-signed') as HTMLTextAreaElement).value);
 assert.equal((await checkSourceRecord(input,signed.report)).valid,true);
 assert.equal(calls,0);dom.window.close();
});
const load=(transport:typeof fetch)=>new JSDOM(html,{url:'https://veylens.test/workspace.html',runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{TextEncoder,fetch:transport,AbortSignal,structuredClone});}});
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

test('guided case import reaches public reuse finding, remedies and independent source replay',async()=>{
 const input=controlledCase();const dom=load(async()=>Response.json({}));const doc=dom.window.document;
 const file={size:JSON.stringify(input).length,text:async()=>JSON.stringify(input)};
 Object.defineProperty(doc.getElementById('case-file'),'files',{value:[file],configurable:true});doc.getElementById('case-file')!.dispatchEvent(new dom.window.Event('change'));
 for(let n=0;n<150&&(doc.getElementById('results') as HTMLElement).hidden;n++)await new Promise(r=>setTimeout(r,10));
 assert.equal((doc.getElementById('results') as HTMLElement).hidden,false);assert.match(doc.getElementById('r-verdict')!.textContent!,/High risk/);assert.match(doc.getElementById('case-checkpoints')!.textContent!,/fresh supported refund/);
 const signed=JSON.parse((doc.getElementById('r-signed') as HTMLTextAreaElement).value);assert.equal((await checkSourceRecord(input,signed.report)).valid,true);
 const fixed=controlledCase(true);Object.defineProperty(doc.getElementById('baseline-file'),'files',{value:[file],configurable:true});doc.getElementById('baseline-file')!.dispatchEvent(new dom.window.Event('change'));await new Promise(r=>setTimeout(r,30));
 Object.defineProperty(doc.getElementById('case-file'),'files',{value:[{size:20000,text:async()=>JSON.stringify(fixed)}],configurable:true});doc.getElementById('case-file')!.dispatchEvent(new dom.window.Event('change'));await new Promise(r=>setTimeout(r,50));(doc.getElementById('compare-cases') as HTMLButtonElement).click();await new Promise(r=>setTimeout(r,50));assert.match(doc.getElementById('comparison-result')!.textContent!,/Removed: public-source-address-reuse/);assert.match(doc.getElementById('comparison-result')!.textContent!,/do not establish privacy/);dom.window.close();
});
