import {reviewCase,compareCaseReports} from '../case.js';
import {inspectWalletExport} from '../wallet.js';
import {loadInput} from './app.js';
import {inspectReceiver} from '../receivers.js';
import {decodeZcashTransaction} from '../zcash.js';
const get=(id:string)=>document.getElementById(id);
const value=(id:string)=>(get(id) as HTMLInputElement).value.trim();
const status=(text:string)=>{const out=get('intake-status');if(out)out.textContent=text;};
type RecordRow={txid:string;hex:string;receipt?:unknown};
type CaseDraft={format:'veylens-case/1';network:'mainnet'|'testnet';transactions:RecordRow[];provider?:unknown;providerReceipt?:unknown;providerLookup?:{depositAddress:string;memo:string};shieldingTxid?:string;refundTxid?:string;refundTo?:string};
let caseRevision=0;
let draft:CaseDraft={format:'veylens-case/1',network:'mainnet',transactions:[]};
async function lookup(path:string,payload:unknown):Promise<{data:unknown;receipt?:unknown}>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json() as {data:unknown;receipt?:unknown;error?:string};
 if(!response.ok)throw new Error(result.error??'Lookup failed.');return result;
}
function roles():void{
 const shield=value('case-shielding'),refund=value('case-refund');
 delete draft.shieldingTxid;delete draft.refundTxid;
 if(shield)draft.shieldingTxid=shield.toLowerCase();if(refund)draft.refundTxid=refund.toLowerCase();
}
function showDraft(run=false):void{loadInput(draft,run);const summary=get('case-record-count');if(summary)summary.textContent=`${draft.transactions.length} transaction records. ${draft.provider?'Provider record attached.':'No provider record attached.'}`;}
async function collectTx(txid:string,network:'mainnet'|'testnet'):Promise<RecordRow>{
 const result=await lookup('/api/zcash-transaction',{txid,network});const data=result.data as RecordRow;
 const decoded=decodeZcashTransaction(data.hex,network);if(decoded.txid!==txid.toLowerCase()||data.txid.toLowerCase()!==decoded.txid)throw new Error('Source transaction ID mismatch.');
 return {...data,...(result.receipt?{receipt:result.receipt}:{})};
}
get('collect')?.addEventListener('click',async()=>{
 const button=get('collect') as HTMLButtonElement;
 if(!(get('lookup-consent') as HTMLInputElement).checked)return status('Confirm the identifier disclosure before lookup.');
 const revision=++caseRevision;const busyIds=['clear-case','case-file','review-case','case-shielding','case-refund','lookup-network','intake-mode'];for(const id of busyIds){const control=get(id) as HTMLInputElement|null;if(control)control.disabled=true;}
 button.disabled=true;status('Collecting source records…');
 try{
  const network=value('lookup-network')==='testnet'?'testnet':'mainnet';
  if(network!==draft.network&&(draft.transactions.length||draft.provider))throw new Error('Clear the case before changing networks.');draft.network=network;roles();
  const mode=value('intake-mode'),identifier=value('lookup-id');if(mode==='swap'&&network!=='mainnet')throw new Error('Zcash 1Click status requires mainnet.');let queue:string[]=[];
  if(mode==='swap'){
   const binding={depositAddress:identifier,memo:value('lookup-memo')};const response=await lookup('/api/oneclick-status',binding);
   draft.provider=response.data;delete draft.providerReceipt;delete draft.providerLookup;if(response.receipt){draft.providerReceipt=response.receipt;draft.providerLookup=binding;}
   const provider=response.data as {swapDetails?:{originChainTxHashes?:Array<{hash:string}>}};
   queue=(provider.swapDetails?.originChainTxHashes??[]).map(r=>r.hash).filter(id=>/^[a-f\d]{64}$/i.test(id));
  }else queue=[identifier];
  if(draft.shieldingTxid)queue.unshift(draft.shieldingTxid);if(draft.refundTxid)queue.unshift(draft.refundTxid);
  const unique=[...new Set(queue.map(id=>id.toLowerCase()))];let missing=0;
  const previous:string[]=[];
  for(const txid of unique){if(draft.transactions.some(r=>r.txid===txid))continue;if(draft.transactions.length>=20){missing++;continue;}
   try{const row=await collectTx(txid,network);draft.transactions.push(row);const decoded=decodeZcashTransaction(row.hex,network);previous.push(...decoded.inputs.filter(i=>!i.coinbase).map(i=>i.txid));}catch(e){if(mode==='transaction'&&txid===identifier.toLowerCase())throw e;missing++;}}
  // Resolve shielding prevouts first, then other input records within the global 20-record budget.
  if(draft.shieldingTxid){const shield=draft.transactions.find(r=>r.txid===draft.shieldingTxid);if(shield)previous.unshift(...decodeZcashTransaction(shield.hex,network).inputs.filter(i=>!i.coinbase).map(i=>i.txid));}
  for(const txid of new Set(previous)){if(draft.transactions.some(r=>r.txid===txid))continue;if(draft.transactions.length>=20){missing++;continue;}status(`Collected ${draft.transactions.length} records. Resolving previous outputs…`);try{draft.transactions.push(await collectTx(txid,network));}catch{missing++;}}
  if(revision!==caseRevision)return;showDraft(true);status(`Collected ${draft.transactions.length} transaction records. ${missing} records unavailable or over budget. Review the case checkpoints and evidence gaps.`);
 }catch(e){if(draft.transactions.length||draft.provider)showDraft();status(e instanceof Error?e.message:'Collection failed.');}finally{button.disabled=false;for(const id of busyIds){const control=get(id) as HTMLInputElement|null;if(control)control.disabled=false;}}
});
get('review-case')?.addEventListener('click',()=>{roles();showDraft(true);});
for(const id of ['case-shielding','case-refund'])get(id)?.addEventListener('input',()=>{const results=get('results');if(results)results.hidden=true;status('Case roles changed. Review attached evidence again.');});
get('clear-case')?.addEventListener('click',()=>{caseRevision++;draft={format:'veylens-case/1',network:value('lookup-network')==='testnet'?'testnet':'mainnet',transactions:[]};for(const id of ['case-shielding','case-refund','lookup-id','lookup-memo'])(get(id) as HTMLInputElement).value='';showDraft();status('Case cleared.');});
get('case-file')?.addEventListener('change',async event=>{
 const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;const revision=++caseRevision;
 try{
  if(file.size>2_000_000)throw new Error('Case file exceeds 2 MB.');const raw=JSON.parse(await file.text()) as CaseDraft&{quoteRequest?:unknown;quoteResponse?:unknown};
  let candidate=structuredClone(draft);
  if(raw.format==='veylens-case/1')candidate=raw;
  else if(raw.quoteRequest||raw.quoteResponse){candidate.provider=raw;delete candidate.providerReceipt;delete candidate.providerLookup;}
  else if(Array.isArray(raw.transactions)&&['mainnet','testnet'].includes(raw.network)){
   if(candidate.network!==raw.network&&(candidate.transactions.length||candidate.provider))throw new Error('Imported network conflicts with this case.');candidate.network=raw.network;
   for(const row of raw.transactions){const existing=candidate.transactions.find(r=>r.txid===row.txid);if(existing&&existing.hex!==row.hex)throw new Error('Conflicting transaction bytes.');if(!existing)candidate.transactions.push(row);}
   if(raw.shieldingTxid)candidate.shieldingTxid=raw.shieldingTxid;if(raw.refundTxid)candidate.refundTxid=raw.refundTxid;if(raw.refundTo)candidate.refundTo=raw.refundTo;
  }else throw new Error('Import a case, transaction bundle, or original 1Click record.');
  const checked=await reviewCase(candidate);if(!checked.ok){throw new Error(checked.errors.join(' '));}
  if(revision!==caseRevision)return;draft=candidate;
  (get('case-shielding') as HTMLInputElement).value=draft.shieldingTxid??'';(get('case-refund') as HTMLInputElement).value=draft.refundTxid??'';(get('lookup-network') as HTMLSelectElement).value=draft.network;
  showDraft(true);status('Imported locally. Collection receipts are checked when present.');
 }catch(e){status(e instanceof Error?e.message:'Invalid case file.');}
});
function download(data:unknown,name:string):void{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
get('download-source')?.addEventListener('click',()=>{try{download(JSON.parse(value('flow-input')),'veylens-case-evidence.json');}catch{status('No valid source evidence to download.');}});
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

let baseline:unknown;
get('baseline-file')?.addEventListener('change',async event=>{
 const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
 try{if(file.size>2_000_000)throw new Error('Baseline exceeds 2 MB.');const raw=JSON.parse(await file.text());const checked=await reviewCase(raw);if(!checked.ok)throw new Error(checked.errors.join(' '));baseline=raw;const out=get('comparison-result');if(out)out.textContent='Baseline validated locally. Compare it with the current attached case.';}catch(e){baseline=undefined;const out=get('comparison-result');if(out)out.textContent=e instanceof Error?e.message:'Invalid baseline.';}
});
get('compare-cases')?.addEventListener('click',async()=>{
 const out=get('comparison-result');if(!out)return;
 try{if(!baseline)throw new Error('Import the original case evidence first.');roles();const before=await reviewCase(baseline),after=await reviewCase(draft);if(!before.ok||!after.ok)throw new Error('Both cases must contain valid evidence.');const comparison=compareCaseReports(before.report,after.report);out.textContent=`Removed: ${comparison.removed.join(', ')||'none'}. Added: ${comparison.added.join(', ')||'none'}. Remaining: ${comparison.remaining.join(', ')||'none'}. Evidence changes: ${comparison.evidenceWarnings.join(' ')||'No additional gaps identified.'} ${comparison.notice}`;}catch(e){out.textContent=e instanceof Error?e.message:'Comparison failed.';}
});
