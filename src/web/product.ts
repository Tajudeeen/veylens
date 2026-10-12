import {inspectWalletExport} from '../wallet.js';
import {loadInput} from './app.js';
import {inspectReceiver} from '../receivers.js';
import {decodeZcashTransaction} from '../zcash.js';
const get=(id:string)=>document.getElementById(id);
const value=(id:string)=>(get(id) as HTMLInputElement).value.trim();
const status=(text:string)=>{const out=get('intake-status');if(out)out.textContent=text;};
async function lookup(path:string,payload:unknown):Promise<unknown>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json() as {data?:unknown;error?:string};
 if(!response.ok)throw new Error(result.error??'Lookup failed.');return result.data;
}
get('collect')?.addEventListener('click',async()=>{
 const button=get('collect') as HTMLButtonElement;
 if(!(get('lookup-consent') as HTMLInputElement).checked)return status('Confirm the identifier disclosure before lookup.');
 button.disabled=true;status('Collecting source records…');
 try{
  const mode=value('intake-mode'),identifier=value('lookup-id');
  if(mode==='swap'){const provider=await lookup('/api/oneclick-status',{depositAddress:identifier,memo:value('lookup-memo')});loadInput(provider,true);status('Provider response imported. Quote verification runs locally; status fields are provider-reported.');}
  else{
   const network=value('lookup-network');const first=await lookup('/api/zcash-transaction',{txid:identifier,network}) as {txid:string;hex:string};
   const records=[first];const decoded=decodeZcashTransaction(first.hex,network==='testnet'?'testnet':'mainnet');
   const ids=[...new Set(decoded.inputs.filter(i=>!i.coinbase).map(i=>i.txid))].slice(0,19);let missing=0;
   for(const txid of ids){status(`Collected ${records.length} records. Resolving previous outputs…`);try{records.push(await lookup('/api/zcash-transaction',{txid,network}) as {txid:string;hex:string});}catch{missing++;}}
   loadInput({format:'veylens-zcash-evidence/1',network,transactions:records,observation:{source:'live lookup; source claims are not offline authenticated',observedAt:new Date().toISOString()}},true);
   status(`Imported ${records.length} ID-checkable records. ${missing} previous records unavailable. Inspect roles in the local editor before attributing a refund.`);
  }
 }catch(e){status(e instanceof Error?e.message:'Lookup failed. No evidence was substituted.');}finally{button.disabled=false;}
});
get('inspect-receiver')?.addEventListener('click',()=>{
 const out=get('receiver-result');if(!out)return;
 try{const result=inspectReceiver(value('receiver-address'),value('lookup-network')==='testnet'?'testnet':'mainnet');out.textContent=`${result.encoding}: ${result.receivers.map(r=>r.kind).join(', ')}. ${result.limitations.join(' ')}`;}catch(e){out.textContent=e instanceof Error?e.message:'Invalid address.';}
});
get('share-summary')?.addEventListener('click',()=>{
 try{
  const signed=JSON.parse((get('r-signed') as HTMLTextAreaElement).value) as {report:{rulesetVersion:string;findings:Array<{ruleId:string;severity:string}>}};
  const report=signed.report;if(!report)throw new Error('Generate a report first.');
  const summary={format:'veylens-redacted-summary/1',rulesetVersion:report.rulesetVersion,riskCounts:{high:report.findings.filter(f=>f.severity==='high').length,medium:report.findings.filter(f=>f.severity==='medium').length,info:report.findings.filter(f=>f.severity==='info').length},coverage:'incomplete',notice:'Redacted summary only. No source evidence, signature or independently reproducible conclusions.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(summary,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='veylens-redacted-summary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{status('Generate a signed report before exporting its summary.');}
});

get('inspect-wallet')?.addEventListener('click',()=>{
 const out=get('wallet-result');if(!out)return;
 try{const text=value('wallet-input');if(text.length>2_000_000)throw new Error('Wallet export exceeds 2 MB.');out.textContent=JSON.stringify(inspectWalletExport(JSON.parse(text)),null,2);}catch(e){out.textContent=e instanceof Error?e.message:'Invalid wallet export.';}
});
