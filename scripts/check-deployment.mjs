// Read-only production smoke check. Private Site token is accepted through the environment only.
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../dist/src/version.js';
import {verifyCollection} from '../dist/src/collection.js';
import {reviewCase} from '../dist/src/case.js';
const options=new Map();const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){const key=args[i],value=args[++i];if(!['--url','--case','--require-node'].includes(key)||!value||options.has(key))throw new Error('Use --url https://site [--case public-case.json] [--require-node mainnet|testnet].');options.set(key,value);}
const origin=new URL(options.get('--url')??'https://veylens-privacy-workspace.deeen-code.chatgpt.site');if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw new Error('Use an HTTPS deployment origin without credentials, path or query data.');
if(process.env.VEYLENS_SITE_TOKEN&&(!origin.hostname.endsWith('.chatgpt.site')||process.env.VERCEL_AUTOMATION_BYPASS_SECRET))throw new Error('Use only the credential matching the destination hosting platform.');
if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET&&!origin.hostname.endsWith('.vercel.app'))throw new Error('Use a Vercel deployment origin with its automation bypass secret.');
const headers={'Content-Type':'application/json',Origin:origin.origin,...(process.env.VEYLENS_SITE_TOKEN?{'OAI-Sites-Authorization':`Bearer ${process.env.VEYLENS_SITE_TOKEN}`}:{}) ,...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})};
async function get(path,body){const response=await fetch(new URL(path,origin),{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Deployment check failed at ${path}: HTTP ${response.status}.`);return response.json();}
const caps=await get('/api/capabilities');if(caps.version!==APP_VERSION||caps.collectorSigning!==true||caps.collectionProtection!=='persistent-budget')throw new Error('Deployment version, pinned signer or persistent protection is not ready.');
let recordReplay='not-requested',node='not-requested';
if(options.has('--case')){
 const source=JSON.parse(readFileSync(options.get('--case'),'utf8'));if(source.format!=='veylens-case/1'||!Array.isArray(source.transactions)||source.transactions.length>20||!['mainnet','testnet'].includes(source.network))throw new Error('Supply a bounded case with an explicit network.');const input=structuredClone(source);input.transactions=[];
 for(const row of source.transactions){const binding={txid:row.txid,network:source.network},result=await get('/api/zcash-transaction',binding);if(!result.receipt||!await verifyCollection(result.data,result.receipt,result.receipt.source,binding))throw new Error('Deployed receipt did not verify.');input.transactions.push({...result.data,receipt:result.receipt,...(result.observation?{observation:result.observation,observationReceipt:result.observationReceipt}:{})});}
 const reviewed=await reviewCase(input);if(!reviewed.ok)throw new Error('Re-collected source could not be independently reviewed.');recordReplay='verified';
}
if(options.has('--require-node')){const network=options.get('--require-node');if(!['mainnet','testnet'].includes(network))throw new Error('Choose mainnet or testnet.');const response=await get('/api/source-health',{network});node=response.status;if(node!=='checked-node-observation'){console.log(JSON.stringify({version:caps.version,recordReplay,node,notice:'Node infrastructure is not configured. This is an outstanding deployment dependency.'}));process.exit(3);}}
console.log(JSON.stringify({version:caps.version,pinnedSigner:true,persistentProtection:true,recordReplay,node,notice:'Operational checks only. No wallet transaction, provider refund, consensus or ownership proof is created.'},null,2));
