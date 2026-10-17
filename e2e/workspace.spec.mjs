import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const folder='examples/testnet-refund/';
const vulnerable=JSON.parse(readFileSync(folder+'vulnerable.case.json','utf8'));
const corrected=JSON.parse(readFileSync(folder+'corrected.case.json','utf8'));
const upload=(object,name='case.json')=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(object))});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('veylens-splash-seen','1'));
});
test('real testnet case imports, downloads and independently replays under browser CSP',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/workspace.html');await expect(page.locator('#flow-input')).toHaveValue('');
 await page.locator('#case-file').setInputFiles(upload(vulnerable));
 await expect(page.locator('#r-verdict')).toContainText('High risk');
 await expect(page.locator('#r-signed')).not.toHaveValue('');
 await expect(page.locator('#review-empty')).toBeHidden();
 await page.screenshot({path:testInfo.outputPath('workspace-report.png'),fullPage:true});
 const signed=await page.locator('#r-signed').inputValue();
 const reportDownload=page.waitForEvent('download');await page.locator('#download-signed').click();expect((await reportDownload).suggestedFilename()).toContain('signed-report.json');
 const sourceDownload=page.waitForEvent('download');await page.locator('#download-source').click();expect((await sourceDownload).suggestedFilename()).toBe('veylens-case-evidence.json');
 await page.goto('/verify.html');await page.locator('#v-in').fill(signed);await page.locator('#v-run').click();await expect(page.locator('#v-out')).toHaveAttribute('data-state','ok');
 await page.getByText('Verify against the original evidence',{exact:true}).click();await page.locator('#v-source').fill(JSON.stringify(vulnerable));await page.locator('#v-source-run').click();await expect(page.locator('#v-source-out')).toHaveAttribute('data-state','ok');
 const changed=JSON.parse(signed);changed.report.findings=[];await page.locator('#v-in').fill(JSON.stringify(changed));await page.locator('#v-run').click();await expect(page.locator('#v-out')).toHaveAttribute('data-state','bad');
 expect(errors).toEqual([]);
});
test('baseline comparison removes reuse while preserving insufficient evidence and fitting the viewport',async({page})=>{
 await page.goto('/workspace.html');await page.getByText('Compare a corrected integration',{exact:true}).click();await page.locator('#baseline-file').setInputFiles(upload(vulnerable));await expect(page.locator('#comparison-result')).toContainText('Baseline validated');
 await page.locator('#case-file').setInputFiles(upload(corrected));await expect(page.locator('#r-signed')).not.toHaveValue('');
 const report=JSON.parse(await page.locator('#r-signed').inputValue());expect(report.report.overallResult).toBe('insufficient');
 await page.locator('#compare-cases').click();await expect(page.locator('#comparison-result')).toContainText(/Removed: [^.]*public-source-address-reuse-in-supplied-transactions\./);
 await expect(page.locator('#comparison-result')).toContainText('do not establish privacy');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('failed collection preserves the empty case and requires disclosure consent',async({page})=>{
 let calls=0;await page.route('**/api/zcash-transaction',async route=>{calls++;await route.fulfill({status:400,json:{error:'Source unavailable.'}});});
 await page.goto('/workspace.html');await page.locator('#lookup-id').fill(vulnerable.refundTxid);await page.locator('#collect').click();expect(calls).toBe(0);
 await page.locator('#lookup-consent').check();await page.locator('#collect').click();await expect(page.locator('#intake-status')).toContainText('Source unavailable');expect(calls).toBe(1);await expect(page.locator('#flow-input')).toHaveValue('');
});

test('visual identity and navigation work across overview and investigation pages',async({page},testInfo)=>{
 for(const name of ['index','workspace','verify','methodology','demo']){
  await page.goto('/'+name+'.html');
  const logo=page.locator('.brand-symbol:visible').first();await expect(logo).toBeVisible();
  await expect.poll(()=>logo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(name+'.png'),fullPage:true,animations:'disabled'});
 }
 if(testInfo.project.name==='chromium')await page.setViewportSize({width:820,height:1180});
 await page.goto('/workspace.html');
 await page.screenshot({path:testInfo.outputPath('navigation-viewport.png'),fullPage:true,animations:'disabled'});
 if(await page.locator('.mobile-menu').isVisible()){
  await page.locator('.mobile-menu summary').click();await page.locator('.mobile-menu').getByRole('link',{name:'Verify report'}).click();
 }else await page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Verify report'}).click();
 await expect(page).toHaveURL(/verify.html$/);
});
