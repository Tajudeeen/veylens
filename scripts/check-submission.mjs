import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {APP_VERSION} from '../dist/src/version.js';
import {reviewCase,compareCaseReports} from '../dist/src/case.js';
import {checkSourceRecord} from '../dist/src/evidence.js';
import {signReport,generateKeyPair,verifySignedReport} from '../dist/src/attest.js';
const results=[];
for(const name of ['vulnerable','corrected']){
 const source=JSON.parse(readFileSync(`examples/testnet-refund/collector-${name}.case.json`,'utf8'));const result=await reviewCase(source,1234);assert.ok(result.ok);
 const signed=signReport(result.report,generateKeyPair().privateKeyPem);assert.equal(verifySignedReport(signed).valid,true);assert.equal((await checkSourceRecord(source,result.report)).valid,true);results.push(result.report);
}
assert.equal(results[0].overallResult,'fail');assert.equal(results[1].overallResult,'insufficient');assert.ok(compareCaseReports(...results).removed.includes('public-source-address-reuse-in-supplied-transactions'));
for(const name of ['index','workspace','compare','verify','methodology','demo'])assert.ok(existsSync(`dist/client/${name}.html`),`Build web output first: ${name}`);
assert.equal(JSON.parse(readFileSync('package.json','utf8')).version,APP_VERSION);
const workspace=readFileSync('dist/client/workspace.html','utf8');for(const id of ['save-local','unlock-local','vault-file','open-verifier','probe-node'])assert.ok(workspace.includes(`id="${id}"`));
assert.equal(JSON.parse(readFileSync('.openai/hosting.json','utf8')).d1,'DB');assert.ok(existsSync('drizzle/meta/_journal.json'));
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(vercel.outputDirectory,'dist/client');assert.equal(vercel.buildCommand,'npm run build:web');for(const name of ['capabilities','collector-keys','source-health','oneclick-status','zcash-transaction','zcash-inclusion'])assert.ok(existsSync(`api/${name}.ts`));assert.ok(existsSync('SECURITY.md'));assert.ok(existsSync('CONTRIBUTING.md'));assert.ok(existsSync('LICENSE'));
console.log(JSON.stringify({version:JSON.parse(readFileSync('package.json','utf8')).version,checks:{realTestnetRegression:true,reportIntegrity:true,independentReplay:true,correctedCaseComparison:true,webArtifacts:true},externalEvidenceStillRequired:['Attributed live provider refund','Authenticated shielded delivery and ownership','Independent consensus validation'],notice:'Passing executable submission checks does not certify complete evidence or reviewer access.'},null,2));
