import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { webcrypto } from "node:crypto";
import { reviewProviderInput, digestInput } from "../src/evidence.js";
import { generateKeyPair, signReport, verifySignedReport } from "../src/attest.js";
import { renderHtmlReport } from "../src/viewer.js";
import { buildAppHtml } from "../src/web/build.js";
import { renderSitePages } from "../src/web/page.js";
import { runAudit } from "../src/engine.js";

const quote = JSON.parse(readFileSync('test/fixtures/evidence/oneclick-live-dry-quote.json', 'utf8'));
const copy = () => structuredClone(quote);
async function review(raw: unknown) {
  const result = await reviewProviderInput(raw, 1791826500);
  assert.ok(result.ok, !result.ok ? result.errors.join(', ') : '');
  return result.report;
}
test('real dry quote authenticates with the pinned SDK key but cannot establish a private transaction', async () => {
  const r = await review(quote);
  assert.equal(r.evidence?.quoteSignature, 'valid');
  assert.equal(r.overallResult, 'insufficient');
  assert.ok(r.findings.some(f => f.ruleId === 'transparent-refund-configuration'));
  assert.match(r.evidence!.gaps.join(' '), /Dry quote/);
  assert.equal(r.evidence!.facts.find(f => f.path === 'quoteRequest.refundTo')!.trust, 'provider-signed');
});
test('changing refundTo or the quote amount invalidates the provider signature', async () => {
  for (const modify of [(q: typeof quote) => { q.quoteRequest.refundTo = 'u1fake'; }, (q: typeof quote) => { q.quote.amountOut = '123'; }]) {
    const q = copy(); modify(q);
    const r = await review(q);
    assert.equal(r.evidence?.quoteSignature, 'invalid');
    assert.equal(r.overallResult, 'insufficient');
    assert.ok(r.evidence!.facts.every(f => f.trust !== 'provider-signed'));
  }
});
test('a declared source match is labelled as an assertion, even with an authentic quote', async () => {
  const r = await review({ format:'veylens-evidence/1', provider:quote, context:{shieldingSourceAddresses:[quote.quoteRequest.refundTo]} });
  assert.equal(r.overallResult, 'fail');
  assert.equal(r.evidence?.quoteSignature, 'valid');
  assert.match(r.findings.find(f => f.ruleId === 'configured-refund-source-reuse')!.message, /user assertion/);
  assert.equal(r.evidence!.facts.at(-1)!.trust, 'user-assertion');
});
test('status fields and tx hashes never inherit the embedded quote signature', async () => {
  const status = { correlationId: quote.correlationId, quoteResponse: quote, status:'REFUNDED', updatedAt: quote.timestamp,
    swapDetails:{refundedAmount:'0', originChainTxHashes:[{hash:'fake-hash',explorerUrl:'javascript:alert(1)'}],destinationChainTxHashes:[]} };
  const r = await review(status);
  assert.equal(r.evidence?.quoteSignature, 'valid');
  assert.equal(r.evidence!.facts.find(f => f.path === 'status')!.trust, 'provider-reported-unverified');
  assert.match(r.evidence!.gaps.join(' '), /conflicts/);
  assert.ok(r.evidence!.facts.filter(f => f.path.startsWith('swapDetails')).every(f => f.trust === 'provider-reported-unverified'));
});
test('unified-looking address, INTENTS refund, and absent signature never yield a privacy pass', async () => {
  for (const refundType of ['ORIGIN_CHAIN','INTENTS']) {
    const q = copy(); q.signature = ''; q.quoteRequest.refundTo = 'u1not-a-decoded-address'; q.quoteRequest.refundType = refundType;
    const r = await review(q);
    assert.equal(r.overallResult, 'insufficient');
    assert.equal(r.evidence?.quoteSignature, 'missing');
  }
});
test('wrong asset, invalid atomic amounts, bad status, and oversized context fail validation', async () => {
  const bads = [copy(),copy(),{quoteResponse:quote,status:'MADE_UP',updatedAt:quote.timestamp,swapDetails:{}}, {format:'veylens-evidence/1',provider:quote,context:{shieldingSourceAddresses:Array(101).fill('x')}}];
  bads[0].quoteRequest.originAsset='nep141:eth.omft.near'; bads[1].quoteRequest.amount='1e9';
  for (const q of bads) assert.equal((await reviewProviderInput(q)).ok,false);
});
test('integer strings stay exact and never enter floating point math', async () => {
  const q = copy(); q.quoteRequest.amount = '999999999999999999999999999999999999';
  const r = await review(q);
  assert.equal(r.evidence!.facts.find(f=>f.path==='quoteRequest.amount')!.value,q.quoteRequest.amount);
});
test('evidence digest is order independent but changes when a source record changes', async () => {
  assert.equal(await digestInput({a:1,b:2}),await digestInput({b:2,a:1}));
  const q=copy(); q.extra='changed';
  assert.notEqual(await digestInput(quote),await digestInput(q));
});
test('signature binds provenance, gaps, and source digest as well as findings', async () => {
  for (const mutation of ['inputDigest','gaps','quoteSignature']) {
    const signed=signReport(await review(quote),generateKeyPair().privateKeyPem);
    assert.equal(verifySignedReport(signed).valid,true);
    if(mutation==='inputDigest') signed.report.evidence!.inputDigest='0'.repeat(64);
    if(mutation==='gaps') signed.report.evidence!.gaps=[];
    if(mutation==='quoteSignature') signed.report.evidence!.quoteSignature='missing';
    assert.equal(verifySignedReport(signed).valid,false);
  }
});
test('HTML report includes evidence limitations and its browser verifier validates the expanded report', async () => {
  const signed=signReport(await review(quote),generateKeyPair().privateKeyPem);
  const html=renderHtmlReport(signed);
  assert.match(html,/Evidence and coverage/);
  const dom=new JSDOM(html,{runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w,'TextEncoder',{value:class { encode(s: string) { return new w.Uint8Array(new TextEncoder().encode(s)); } }});}});
  dom.window.document.getElementById('verify')!.click();
  await until(()=>dom.window.document.getElementById('verify-result')!.dataset['state']==='ok');
  dom.window.close();
});
async function until(check:()=>boolean) { for(let i=0;i<150;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Timed out'); }
test('workspace imports and verifies the authentic quote without inventing flow events', async () => {
  const html=await buildAppHtml();
  const pages=renderSitePages({js:html.match(/<script>([\s\S]*?)<\/script>/)![1]!,version:'0.5.0'});
  const dom=new JSDOM(pages['workspace.html'],{url:'https://veylens.test/workspace.html',runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w,'TextEncoder',{value:class { encode(s: string) { return new w.Uint8Array(new TextEncoder().encode(s)); } }});}});
  const d=dom.window.document;
  d.getElementById('load-provider')!.click(); d.getElementById('run')!.click();
  await until(()=>!d.getElementById('results')!.hidden);
  assert.equal(d.getElementById('r-verdict')!.textContent,'Insufficient evidence');
  assert.match(d.getElementById('r-evidence')!.textContent??'',/Quote signature: valid/);
  assert.ok(!d.getElementById('r-timeline')!.textContent?.includes('shielded at'));
  const signed=JSON.parse((d.getElementById('r-signed') as HTMLTextAreaElement).value);
  assert.equal(verifySignedReport(signed).valid,true);
  dom.window.close();
});
test('empty declared flows return insufficient evidence, not pass',()=>{
  assert.equal(runAudit({flowId:'empty',events:[]}).overallResult,'insufficient');
});
test('CLI imports real quote, exits 3 for incomplete evidence, and writes a verifiable report',()=>{
  const dir=mkdtempSync(join(tmpdir(),'veylens-evidence-'));
  const input=join(dir,'quote.json');writeFileSync(input,JSON.stringify(quote));
  const out=spawnSync('node',['dist/src/cli.js','audit',input,'--json'],{encoding:'utf8'});
  assert.equal(out.status,3,out.stderr);
  const signed=JSON.parse(out.stdout);
  assert.equal(signed.report.evidence.quoteSignature,'valid');
  assert.equal(verifySignedReport(signed).valid,true);
});
test('source re-analysis rejects re-signed false provenance and altered source records',async()=>{
  const {checkSourceRecord}=await import('../src/evidence.js');
  const report=await review(quote);
  assert.equal((await checkSourceRecord(quote,report)).valid,true);
  const changed=copy();changed.quoteRequest.refundTo='u1changed';
  assert.equal((await checkSourceRecord(changed,report)).valid,false);
  report.evidence!.quoteSignature='missing';
  const signed=signReport(report,generateKeyPair().privateKeyPem);
  assert.equal(verifySignedReport(signed).valid,true);
  assert.equal((await checkSourceRecord(quote,signed.report)).valid,false);
});
test('declared-flow source verification re-runs findings and rejects a forged clean result',async()=>{
  const {checkSourceRecord,declaredEvidence}=await import('../src/evidence.js');
  const raw=JSON.parse(readFileSync('test/fixtures/zashi-crosspay-leak.json','utf8'));
  const report=runAudit(raw,undefined,()=>1234);report.evidence=await declaredEvidence(raw);
  assert.equal((await checkSourceRecord(raw,report)).valid,true);
  report.findings=[];report.overallResult='insufficient';
  assert.equal((await checkSourceRecord(raw,report)).valid,false);
});
test('independent browser verifier checks original provider evidence and rejects changed source',async()=>{
  const html=await buildAppHtml();
  const pages=renderSitePages({js:html.match(/<script>([\s\S]*?)<\/script>/)![1]!,version:'0.5.0'});
  const dom=new JSDOM(pages['verify.html'],{url:'https://veylens.test/verify.html',runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'crypto',{value:webcrypto});Object.defineProperty(w,'TextEncoder',{value:class{encode(s:string){return new w.Uint8Array(new TextEncoder().encode(s));}}});}});
  const d=dom.window.document;
  (d.getElementById('v-in') as HTMLTextAreaElement).value=JSON.stringify(signReport(await review(quote),generateKeyPair().privateKeyPem));
  const source=d.getElementById('v-source') as HTMLTextAreaElement;
  source.value=JSON.stringify(quote);d.getElementById('v-source-run')!.click();
  await until(()=>d.getElementById('v-source-out')!.dataset['state']==='ok');
  assert.match(d.getElementById('v-source-out')!.textContent??'',/re-analysis match/);
  const changed=copy();changed.quote.amountOut='9876';source.value=JSON.stringify(changed);
  d.getElementById('v-source-run')!.click();await until(()=>d.getElementById('v-source-out')!.dataset['state']==='bad');
  dom.window.close();
});
test('CLI sanitizes declared flow identifiers before creating report files',()=>{
  const dir=mkdtempSync(join(tmpdir(),'veylens-safe-output-'));
  const raw=JSON.parse(readFileSync('test/fixtures/zashi-crosspay-leak.json','utf8'));raw.flowId='../../outside';
  const input=join(dir,'flow.json');writeFileSync(input,JSON.stringify(raw));
  const out=spawnSync('node',['dist/src/cli.js','audit',input,'--json'],{encoding:'utf8'});
  assert.equal(out.status,1,out.stderr);
  assert.equal(verifySignedReport(JSON.parse(readFileSync(join(dir,'_.._outside.signed-report.json'),'utf8'))).valid,true);
});
