// Read-only, fail-closed live smoke check for both public Zcash networks.
// This fetches existing mined transactions only. It creates no wallet transactions.
// Intentionally does not log raw transaction bytes, source identifiers, or secrets.
import {verifyCollection} from '../dist/src/collection.js';
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--url')throw new Error('Usage: node scripts/check-live-networks.mjs --url https://your-deployment');
const origin=new URL(args[1]);
if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw new Error('Use a bare HTTPS origin');
const headers={'Content-Type':'application/json',Origin:origin.origin,...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})};
async function request(path,payload){
 const response=await fetch(new URL(path,origin),{method:payload?'POST':'GET',headers,...(payload?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(path+' returned HTTP '+response.status);
 return response.json();
}
const cases=[
 {network:'testnet',txid:'feb687889c0b613156f301e4a7c66ff60ef06b78ed4437594b65680d74e99007'},
 {network:'mainnet',txid:'43e966e190f8a63dda0add470e9439b2163f3c89a857488b966d6af2ee716851'}
];
const results=[];
try{
 const caps=await request('/api/capabilities');
 if(caps.collectorSigning!==true||caps.collectionProtection!=='persistent-budget')throw new Error('Collector signer or shared budget is not configured');
 for(const binding of cases){
   const response=await request('/api/zcash-transaction',binding);
   if(!response||!response.data||!response.receipt)throw new Error(binding.network+' response lacks data or receipt');
   if(!await verifyCollection(response.data,response.receipt,response.receipt.source,binding))throw new Error(binding.network+' receipt signature, digest or binding invalid');
   if(response.data.txid!==binding.txid)throw new Error(binding.network+' returned mismatched txid');
   if(response.observation && (!response.observationReceipt||!await verifyCollection(response.observation,response.observationReceipt,response.observationReceipt.source,binding)))throw new Error(binding.network+' invalid observation receipt');
   results.push({network:binding.network,status:'verified-collector-observation',observationReceipt:!!response.observationReceipt});
 }
 console.log(JSON.stringify({status:'pass',checks:results,limitations:'Authenticates collected bytes and source observations only; does not establish independent consensus, wallet ownership or a provider refund.'},null,2));
}catch(e){
 console.error(JSON.stringify({status:'fail',verified:results,error:e instanceof Error?e.message:String(e)}));
 process.exitCode=1;
}
