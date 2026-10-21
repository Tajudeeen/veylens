import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const folder='examples/testnet-refund/';
const vulnerable=JSON.parse(readFileSync(folder+'vulnerable.case.json','utf8'));
const corrected=JSON.parse(readFileSync(folder+'corrected.case.json','utf8'));
const upload=(object,name='case.json')=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(object))});
test.beforeEach(async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{sessionStorage.setItem('veylens-splash-seen','1');sessionStorage.setItem('veylens-intro-v2-seen','1');});
});
test('real testnet case imports, downloads and independently replays under browser CSP',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/workspace.html');await expect(page.locator('#flow-input')).toHaveValue('');
 await page.locator('#case-file').setInputFiles(upload(vulnerable));
 await expect(page.locator('#r-verdict')).toContainText('High risk');
 await expect(page.locator('#r-signed')).not.toHaveValue('');
 await expect(page.locator('#review-empty')).toBeHidden();
 expect(await page.locator('#case-checkpoints>p').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1))).toBe(true);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:testInfo.outputPath('workspace-report.png'),fullPage:true,animations:'disabled'});
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
 for(const name of ['index','workspace','compare','verify','methodology','demo']){
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

test('branded splash works on direct workspace entry, reload, and replay with safe focus',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>sessionStorage.removeItem('veylens-intro-v2-seen'));
 await page.goto('/workspace');
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.vl-app')).toHaveAttribute('inert','');
 await expect.poll(()=>page.locator('#splash img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('splash.png'),animations:'disabled'});
 await expect(page.locator('#splash')).toHaveCount(0);
 await expect(page.locator('h1')).toBeFocused();await expect(page.locator('.vl-app')).not.toHaveAttribute('inert','');
 const replay=page.locator('[data-replay-intro]:visible').first();await replay.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#splash')).toHaveCount(0);await expect(replay).toBeFocused();
 await replay.click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('#splash')).toHaveCount(0);await expect(replay).toBeFocused();
 await page.reload();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Continue',exact:true}).click();
});
test('dedicated comparison page independently reviews files and invalidates replaced evidence',async({page},testInfo)=>{
 await page.goto('/compare');await expect(page.locator('#compare-run')).toBeDisabled();
 await page.locator('#compare-before').setInputFiles(upload(vulnerable));await page.locator('#compare-after').setInputFiles(upload(corrected));
 await expect(page.locator('#compare-run')).toBeEnabled();await page.locator('#compare-run').click();
 await expect(page.locator('#compare-removed')).toContainText('public-source-address-reuse-in-supplied-transactions');await expect(page.locator('#compare-notice')).toContainText('do not establish privacy');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const exported=page.waitForEvent('download');await page.locator('#compare-download').click();expect((await exported).suggestedFilename()).toBe('veylens-case-comparison.json');
 await page.screenshot({path:testInfo.outputPath('comparison.png'),fullPage:true,animations:'disabled'});
 await page.locator('#compare-after').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.locator('#compare-run')).toBeDisabled();await expect(page.locator('#comparison-output')).toBeHidden();
 await page.locator('#compare-clear').click();await expect(page.locator('#compare-before-status')).toHaveText('No case attached.');
});
test('main page links navigate distinct documents and demo retains the shared navigation',async({page})=>{
 await page.goto('/workspace/');await expect(page).toHaveURL(/\/workspace$/);
 const nav=page.viewportSize().width<1024?page.getByRole('navigation',{name:'Main pages'}):page.getByRole('navigation',{name:'Primary'});
 await nav.getByRole('link',{name:'Compare',exact:true}).click();await expect(page).toHaveURL(/compare.html$/);await expect(page.locator('h1')).toHaveText('What did the correction change?');
 await page.goBack();await expect(page).toHaveURL(/workspace$/);await expect(page.locator('h1')).toHaveText('Trace the refund.');
 await page.goto('/demo');
 await page.locator('#load-leak').click();await page.locator('#run').click();await expect(page.locator('#r-verdict')).toHaveText('Failed');await expect(page.locator('#r-signed')).not.toHaveValue('');
 if(await page.locator('.mobile-menu').isVisible())await page.locator('.mobile-menu summary').click();
 const demoNav=page.viewportSize().width<1024?page.getByRole('navigation',{name:'All pages'}):page.getByRole('navigation',{name:'Primary'});
 await demoNav.getByRole('link',{name:'Workspace',exact:true}).click();await expect(page).toHaveURL(/workspace.html$/);await expect(page.locator('#flow-input')).toHaveValue('');
});

test('encrypted snapshots are opt-in, restore after reload and reject a wrong passphrase',async({page})=>{
 await page.goto('/workspace');await page.locator('#case-file').setInputFiles(upload(vulnerable));await expect(page.locator('#r-signed')).not.toHaveValue('');
 expect(await page.evaluate(()=>localStorage.getItem('veylens-encrypted-case/1'))).toBeNull();
 await page.getByText('Save or restore this case',{exact:true}).click();await page.locator('#case-passphrase').fill('temporary test passphrase');await page.locator('#save-local').click();await expect(page.locator('#case-storage-status')).toContainText('Encrypted snapshot saved');
 const stored=await page.evaluate(()=>localStorage.getItem('veylens-encrypted-case/1'));expect(stored).not.toContain(vulnerable.refundTxid);expect(stored).not.toContain('temporary test passphrase');
 await page.reload();await expect(page.locator('#splash')).toHaveCount(0);await expect(page.locator('#flow-input')).toHaveValue('');
 await page.getByText('Save or restore this case',{exact:true}).click();await page.locator('#case-passphrase').fill('incorrect test passphrase');await page.locator('#unlock-local').click();await expect(page.locator('#case-storage-status')).toContainText('Could not unlock');await expect(page.locator('#unlock-local')).toBeEnabled();
 await page.locator('#case-passphrase').fill('temporary test passphrase');await page.locator('#unlock-local').click();await expect(page.locator('#r-verdict')).toContainText('High risk');await expect(page.locator('#case-storage-status')).toContainText('restored');
 await page.locator('#case-passphrase').fill('temporary file passphrase');const downloaded=page.waitForEvent('download');await page.locator('#download-vault').click();const file=await downloaded;expect(file.suggestedFilename()).toBe('veylens-encrypted-case.json');
 await expect(page.locator('#download-vault')).toBeEnabled();await page.locator('#clear-case').click();await expect(page.locator('#results')).toBeHidden();await page.locator('#case-passphrase').fill('temporary file passphrase');await page.locator('#vault-file').setInputFiles(await file.path());await expect(page.locator('#r-verdict')).toContainText('High risk');
 await expect(page.locator('#forget-local')).toBeEnabled();await page.locator('#forget-local').click();expect(await page.evaluate(()=>localStorage.getItem('veylens-encrypted-case/1'))).toBeNull();
});
test('one-time handoff independently verifies the current report and consumes its temporary storage',async({page})=>{
 await page.goto('/workspace');await page.locator('#case-file').setInputFiles(upload(vulnerable));await expect(page.locator('#r-signed')).not.toHaveValue('');await page.locator('#open-verifier').click();
 await expect(page).toHaveURL(/verify.html$/);await expect(page.locator('#v-out')).toHaveAttribute('data-state','ok');await expect(page.locator('#v-source-out')).toHaveAttribute('data-state','ok');expect(await page.evaluate(()=>sessionStorage.getItem('veylens-verifier-handoff/1'))).toBeNull();
});
test('leaving an unsaved case warns and allows the user to stay',async({page})=>{
 await page.goto('/workspace');await page.locator('#case-file').setInputFiles(upload(vulnerable));await expect(page.locator('#r-signed')).not.toHaveValue('');
 const nav=page.viewportSize().width<1024?page.getByRole('navigation',{name:'Main pages'}):page.getByRole('navigation',{name:'Primary'});
 const waiting=page.waitForEvent('dialog');const navigating=nav.getByRole('link',{name:page.viewportSize().width<1024?'Verify':'Verify report',exact:true}).click();const dialog=await waiting;expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();await navigating;await expect(page).toHaveURL(/workspace$/);
});
