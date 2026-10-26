import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root='video-output';mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'reduce'});
const page=await context.newPage();
const screens=[['01-overview','/'],['02-workspace','/workspace.html'],['03-demo','/demo.html'],['04-audit','/demo.html'],['05-verify','/verify.html'],['06-compare','/compare.html'],['07-methodology','/methodology.html'],['08-close','/']];
for(const [name,path] of screens){
 await page.goto('https://veylens.vercel.app'+path,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(1800);
 if(name==='03-demo'||name==='04-audit'){
  const load=page.getByRole('button',{name:/load the leak case/i});
  if(await load.count()){await load.first().click();await page.waitForTimeout(1100);}
  if(name==='04-audit'){const btn=page.getByRole('button',{name:/run audit/i});if(await btn.count()){await btn.first().click();await page.waitForTimeout(800);}await page.mouse.wheel(0,400);}
 }else if(name==='02-workspace'||name==='06-compare'){await page.mouse.wheel(0,240);}
 await page.screenshot({path:root+'/'+name+'.png',animations:'disabled'});
 console.log('CAPTURE '+name+' '+page.url());
}
await context.close();await browser.close();
const sections=[
['01-overview',18,'THE PRIVACY PROBLEM','Shielded funds can lose privacy at an integration boundary. A cross chain transfer might end in a transparent refund that reveals public address relationships.','Transparent refunds can expose relationships'],
['02-workspace',19,'ZACHXBT HISTORICAL REPORT','In October twenty twenty five, blockchain investigator Zach X B T highlighted transparent refund address reuse connected with Zashi Cross Pay and Near Intents. Veylens did not discover that issue, and does not claim it is still unpatched.','Historical report only. No claim of an unresolved vulnerability.'],
['03-demo',17,'THE REAL VEYLENS APP','This is the actual deployed Veylens application. Developers can import original transaction evidence, assign the role of each transaction, and inspect what the source proves and what remains uncertain.','Real application: veylens.vercel.app'],
['04-audit',23,'DEMO LAB: RUN THE AUDIT','Here I load the vulnerable example in the live demo lab and run the audit. The result flags public transparent refund address reuse. This user declared flow is a demonstration, not an authenticated Zashi or Near Intents refund. Separately, Veylens contains historical mined Zcash testnet evidence.','Declared demo flow. Not an authenticated provider refund.'],
['05-verify',16,'VERIFY REPORTS','On the real Verify Reports page, independent replay checks signed evidence. Tampering must fail. Signed collector receipts authenticate collected bytes, not chain consensus, shielded note ownership, or complete privacy.','Verify integrity. Do not mistake evidence for a privacy certificate.'],
['06-compare',16,'COMPARE CASES','The comparison view makes a proposed correction visible. Removing a public address reuse finding is progress, but insufficient evidence is still insufficient evidence. A clean comparison is never a blanket privacy guarantee.','Removed finding does not prove complete privacy.'],
['07-methodology',16,'INDEPENDENT VERIFICATION','Real historical mainnet and testnet collections passed our public GitHub Actions smoke checks. The methodology makes each assumption, evidence source and limitation accessible for independent review.','Live Zcash evidence: GitHub Actions run 40288820275'],
['08-close',8,'VEYLENS: CORE AND TOOLING','Veylens. Trust evidence. Verify privacy assumptions. Open source, built for Zcash developers.','veylens.vercel.app    github.com/Tajudeeen/veylens']
];
function call(bin,args){const p=spawnSync(bin,args,{encoding:'utf8'});if(p.status!==0)throw Error(bin+': '+p.stderr?.slice(-2000));}
const font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', files=[];
for(let i=0;i<sections.length;i++){
 const [name,seconds,title,voice,note]=sections[i];
 const wav=root+'/voice-'+i+'.wav',vid=root+'/part-'+i+'.mp4';
 call('espeak-ng',['-v','en-us+m3','-s','148','-w',wav,voice]);
 const clean=t=>t.replace(/[^A-Za-z0-9 .,_+!-]/g,'').slice(0,90);
 const vf='scale=1280:720,drawbox=x=0:y=0:w=1280:h=94:color=0x08151be8:t=fill,drawbox=x=0:y=626:w=1280:h=94:color=0x08151be8:t=fill,drawtext=fontfile='+font+':text='+JSON.stringify(clean(title))+':fontsize=28:fontcolor=white:x=34:y=28,drawtext=fontfile='+font+':text='+JSON.stringify(clean(note))+':fontsize=16:fontcolor=0x5de3cc:x=34:y=665,format=yuv420p';
 call('ffmpeg',['-y','-hide_banner','-loglevel','error','-loop','1','-framerate','12','-i',root+'/'+name+'.png','-i',wav,'-vf',vf,'-af','apad','-t',String(seconds),'-r','24','-c:v','libx264','-preset','veryfast','-crf','24','-c:a','aac','-b:a','128k','-shortest',vid]);
 files.push(vid);
}
writeFileSync(root+'/parts.txt',files.map(x=>'file '+JSON.stringify(x.split('/').pop())).join('\n'));
call('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',root+'/parts.txt','-c','copy','-movflags','+faststart',root+'/veylens-zecathon-actual-app.mp4']);
console.log('VIDEO_READY '+root+'/veylens-zecathon-actual-app.mp4');
