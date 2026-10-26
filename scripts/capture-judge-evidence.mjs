import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const out='judge-capture';mkdirSync(out,{recursive:true});
const vulnerable=JSON.parse(readFileSync('examples/testnet-refund/collector-vulnerable.case.json'));
const corrected=JSON.parse(readFileSync('examples/testnet-refund/collector-corrected.case.json'));
const upload=(a)=>({name:'case.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(a))});
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true,recordVideo:{dir:out,size:{width:1440,height:900}}});
const p=await ctx.newPage();const events=[];await p.addInitScript(()=>{sessionStorage.setItem('veylens-splash-seen','1');sessionStorage.setItem('veylens-intro-v2-seen','1')});
async function shot(name){await p.waitForTimeout(400);await p.screenshot({path:out+'/'+name+'.png',animations:'disabled'});events.push({name,url:p.url(),time:new Date().toISOString()});}
try{
await p.goto('https://veylens.vercel.app/workspace.html',{waitUntil:'domcontentloaded'});await shot('01-real-workspace');
await p.locator('#case-file').setInputFiles(upload(vulnerable));await p.locator('#r-signed').waitFor({state:'visible'});await p.waitForFunction(()=>document.querySelector('#r-signed')?.value?.length>100);
await p.locator('#r-verdict').scrollIntoViewIfNeeded();await shot('02-vulnerable-audit-result');
const signed=await p.locator('#r-signed').inputValue();
const d=p.waitForEvent('download');await p.locator('#download-signed').click();const dl=await d;await dl.saveAs(out+'/signed-report.json');await shot('03-real-export');
await p.locator('#open-verifier').click();await p.locator('#v-out[data-state="ok"]').waitFor();await p.locator('#v-source-out[data-state="ok"]').waitFor();await shot('04-verified-evidence-pass');
const tampered=JSON.parse(signed);tampered.report.findings=[];await p.locator('#v-in').fill(JSON.stringify(tampered));await p.locator('#v-run').click();await p.locator('#v-out[data-state="bad"]').waitFor();await shot('05-tampered-evidence-rejected');
await p.goto('https://veylens.vercel.app/compare.html',{waitUntil:'domcontentloaded'});await p.locator('#compare-before').setInputFiles(upload(vulnerable));await shot('06-baseline-loaded');
await p.locator('#compare-after').setInputFiles(upload(corrected));await p.locator('#compare-run').click();await p.locator('#compare-removed').getByText(/public-source-address-reuse/).first().waitFor().catch(()=>{});await p.locator('#compare-removed').scrollIntoViewIfNeeded();await shot('07-populated-comparison');
await p.goto('https://veylens.vercel.app/methodology.html',{waitUntil:'domcontentloaded'});await shot('08-methodology');
writeFileSync(out+'/events.json',JSON.stringify(events,null,2));console.log('JUDGE_CAPTURE_OK '+JSON.stringify(events));
}finally{await ctx.close();await b.close();}
