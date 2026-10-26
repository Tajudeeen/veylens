import { chromium } from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
mkdirSync('navigation-capture',{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:'navigation-capture',size:{width:1440,height:900}}});
const page=await context.newPage(); const events=[];
await page.addInitScript(()=>{
 const install=()=>{
  if(document.getElementById('demo-cursor'))return;
  const c=document.createElement('div');c.id='demo-cursor';c.setAttribute('aria-hidden','true');
  c.style.cssText='position:fixed;left:240px;top:220px;width:24px;height:28px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #000);';
  c.innerHTML='<svg viewBox="0 0 24 28" width="24" height="28"><path d="M3 2v23l6.6-7.7 4.5 8.1 4-2.2-4.6-8.1L23 13Z" fill="#fff" stroke="#102027" stroke-width="2"/></svg>';
  document.body.appendChild(c);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
});
const nativeMove=page.mouse.move.bind(page.mouse);
let last=[240,220];
page.mouse.move=async(x,y,opts={})=>{
 const n=opts.steps??18,from=[...last];
 for(let i=1;i<=n;i++){
  const px=from[0]+(x-from[0])*i/n,py=from[1]+(y-from[1])*i/n;
  await nativeMove(px,py);
  await page.evaluate(([a,b])=>{const c=document.getElementById('demo-cursor');if(c){c.style.left=a+'px';c.style.top=b+'px';}},[px,py]).catch(()=>{});
  await page.waitForTimeout(18);
 }
 last=[x,y];
};
async function mark(t){events.push({t,url:page.url()});console.log(t+' '+page.url());}
await page.goto('https://veylens.vercel.app/',{waitUntil:'domcontentloaded',timeout:45000});
await mark('LANDING');
await page.mouse.move(240,220,{steps:15});
await page.waitForTimeout(3500);
const splash=page.locator('#splash');
if(await splash.count()){await page.waitForTimeout(1500);const btn=page.getByRole('button',{name:'Continue',exact:true});if(await btn.isVisible())await btn.click();}
await page.waitForTimeout(1200);await page.mouse.move(1100,300,{steps:30});
await page.mouse.wheel(0,350);await page.waitForTimeout(1800);
await page.mouse.wheel(0,-350);await page.waitForTimeout(900);
await page.goto('https://veylens.vercel.app/workspace.html',{waitUntil:'domcontentloaded'});
await mark('WORKSPACE');
await page.waitForTimeout(900);await page.mouse.move(850,430,{steps:26});
await page.mouse.wheel(0,400);await page.waitForTimeout(1500);
await page.goto('https://veylens.vercel.app/demo.html',{waitUntil:'domcontentloaded'});
await mark('DEMO');
await page.waitForTimeout(900);await page.mouse.move(550,360,{steps:25});
const load=page.locator('#load-leak');if(await load.isVisible()){await load.click();await page.waitForTimeout(1200);}
const audit=page.locator('#run');if(await audit.isVisible()){await audit.click();await page.waitForTimeout(1500);}
await page.mouse.wheel(0,450);await page.waitForTimeout(1100);

// Real testnet case: import -> signed proof -> verifier -> tamper -> compare.
const vulnerable=JSON.parse(readFileSync('examples/testnet-refund/vulnerable.case.json','utf8'));
const corrected=JSON.parse(readFileSync('examples/testnet-refund/corrected.case.json','utf8'));
const upload=(obj)=>({name:'case.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});
await page.goto('https://veylens.vercel.app/workspace.html',{waitUntil:'domcontentloaded'});
await mark('IMPORT TESTNET CASE');await page.waitForTimeout(700);
await page.mouse.move(430,370,{steps:35});
await page.locator('#case-file').setInputFiles(upload(vulnerable));
await page.waitForFunction(()=>document.querySelector('#r-signed')?.value?.length>100);
await page.locator('#r-verdict').scrollIntoViewIfNeeded();await page.mouse.move(720,560,{steps:28});await page.waitForTimeout(2800);
const signed=await page.locator('#r-signed').inputValue();
await page.locator('#open-verifier').scrollIntoViewIfNeeded();await page.mouse.move(540,440,{steps:26});await page.waitForTimeout(450);
await page.locator('#open-verifier').click();await page.waitForURL(/verify/);
await page.locator('#v-out[data-state="ok"]').waitFor();await page.locator('#v-source-out[data-state="ok"]').waitFor();
await mark('SIGNED REPORT VERIFIED');await page.mouse.move(780,530,{steps:35});await page.waitForTimeout(3400);
const tampered=JSON.parse(signed);tampered.report.findings=[];
await page.locator('#v-in').fill(JSON.stringify(tampered));await page.locator('#v-run').scrollIntoViewIfNeeded();await page.waitForTimeout(450);await page.locator('#v-run').click();
await page.locator('#v-out[data-state="bad"]').waitFor();await mark('TAMPER REJECTED');
await page.mouse.move(880,570,{steps:35});await page.waitForTimeout(3000);
await page.goto('https://veylens.vercel.app/compare.html',{waitUntil:'domcontentloaded'});
await mark('POPULATED COMPARISON');await page.waitForTimeout(700);
await page.locator('#compare-before').setInputFiles(upload(vulnerable));await page.waitForTimeout(1300);
await page.locator('#compare-after').setInputFiles(upload(corrected));await page.waitForTimeout(1300);
await page.locator('#compare-run').scrollIntoViewIfNeeded();await page.mouse.move(620,450,{steps:30});await page.locator('#compare-run').click();
await page.locator('#compare-removed').scrollIntoViewIfNeeded();await page.mouse.move(800,500,{steps:25});await page.waitForTimeout(4200);
await page.mouse.wheel(0,400);await page.waitForTimeout(1800);
await page.goto('https://veylens.vercel.app/methodology.html',{waitUntil:'domcontentloaded'});await mark('METHODOLOGY');
await page.mouse.move(530,340,{steps:25});await page.mouse.wheel(0,350);await page.waitForTimeout(2200);
writeFileSync('navigation-capture/events.json',JSON.stringify(events,null,2));
await context.close();await browser.close();console.log('NAVIGATION_RECORDING_COMPLETE');
