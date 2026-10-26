import { chromium } from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
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
writeFileSync('navigation-capture/events.json',JSON.stringify(events,null,2));
await context.close();await browser.close();console.log('NAVIGATION_RECORDING_COMPLETE');
