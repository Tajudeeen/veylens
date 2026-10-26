import { chromium } from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
mkdirSync('navigation-capture',{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:'navigation-capture',size:{width:1440,height:900}}});
const page=await context.newPage(); const events=[];
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
