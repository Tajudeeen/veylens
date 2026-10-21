import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('deployment checker rejects credentials for the wrong hosting destination before any request',()=>{
 for(const [url,env] of [
  ['https://example.com',{VEYLENS_SITE_TOKEN:'synthetic-site-token'}],
  ['https://example.vercel.app',{VEYLENS_SITE_TOKEN:'synthetic-site-token'}],
  ['https://example.chatgpt.site',{VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-vercel-token'}],
  ['https://example.chatgpt.site',{VEYLENS_SITE_TOKEN:'synthetic-site-token',VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-vercel-token'}],
 ] as const){
  const result=spawnSync(process.execPath,['scripts/check-deployment.mjs','--url',url],{encoding:'utf8',env});
  assert.notEqual(result.status,0);assert.match(result.stderr,/credential matching|Vercel deployment origin/);assert.ok(!result.stderr.includes('synthetic-'));
 }
});
test('deployment checker requires a clean HTTPS origin',()=>{
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?token=bad','https://example.com/#data']){
  const result=spawnSync(process.execPath,['scripts/check-deployment.mjs','--url',url],{encoding:'utf8',env:{}});
  assert.notEqual(result.status,0);assert.match(result.stderr,/HTTPS deployment origin/);
 }
});
