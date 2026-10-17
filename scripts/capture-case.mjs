// Read-only re-capture. Never creates a quote, deposit, trade, refund or wallet transaction.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {handleApi} from '../dist/src/server/api.js';
import {reviewCase} from '../dist/src/case.js';
const args=process.argv.slice(2);const options=new Map();
for(let i=0;i<args.length;i++){const key=args[i];if(!['--input','--out','--inclusion'].includes(key)||options.has(key))throw new Error('Use --input case.json --out fresh.capture.json [--inclusion].');if(key==='--inclusion')options.set(key,true);else{const value=args[++i];if(!value||value.startsWith('--'))throw new Error('Missing argument value.');options.set(key,value);}}
if(!options.has('--input')||!options.has('--out'))throw new Error('Use --input case.json --out fresh.capture.json [--inclusion].');
const input=JSON.parse(readFileSync(String(options.get('--input')),'utf8'));const initial=await reviewCase(input);if(!initial.ok)throw new Error(initial.errors.join(' '));
const env=Object.fromEntries(['COLLECTOR_SIGNING_KEY','ONECLICK_API_KEY','ZEBRA_RPC_URL','ZEBRA_RPC_AUTH','ZEBRA_NETWORK','ZCASH_MAINNET_RPC_URL','ZCASH_MAINNET_RPC_AUTH','ZCASH_TESTNET_RPC_URL','ZCASH_TESTNET_RPC_AUTH'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
async function request(path,body){const response=await handleApi(new Request('https://capture.veylens.local'+path,{method:'POST',headers:{Origin:'https://capture.veylens.local','Content-Type':'application/json'},body:JSON.stringify(body)}),env);const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
const output=structuredClone(input);output.transactions=[];
if(input.providerLookup){const status=await request('/api/oneclick-status',input.providerLookup);output.provider=status.data;delete output.providerReceipt;if(status.receipt)output.providerReceipt=status.receipt;}
const queue=new Set(input.transactions.map(r=>r.txid));if(input.shieldingTxid)queue.add(input.shieldingTxid);if(input.refundTxid)queue.add(input.refundTxid);
const provider=output.provider?.format==='veylens-evidence/1'?output.provider.provider:output.provider;
for(const entry of provider?.swapDetails?.originChainTxHashes??[])if(/^[a-f0-9]{64}$/i.test(entry.hash))queue.add(entry.hash.toLowerCase());
if(queue.size>20)throw new Error('Case exceeds the 20-record collection limit.');
for(const txid of queue){
 const result=await request('/api/zcash-transaction',{txid,network:input.network});const row={...result.data,...(result.receipt?{receipt:result.receipt}:{}),...(result.observation?{observation:result.observation}:{}),...(result.observationReceipt?{observationReceipt:result.observationReceipt}:{})};
 if(options.has('--inclusion')){const proof=await request('/api/zcash-inclusion',{txid,network:input.network});row.chainProof=proof.data;if(proof.receipt)row.chainReceipt=proof.receipt;}
 output.transactions.push(row);
}
const reviewed=await reviewCase(output);if(!reviewed.ok)throw new Error(reviewed.errors.join(' '));
const out=resolve(String(options.get('--out')));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(output,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({file:out,records:output.transactions.length,result:reviewed.report.overallResult,findings:reviewed.report.findings.map(f=>f.ruleId),notice:'Source observations only. Consensus, wallet ownership and provider honesty remain outside scope.'}));
