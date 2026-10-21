import {encryptCase,decryptCase} from './vault.js';
import {isCase,reviewCase} from '../case.js';
import {isProviderInput,reviewProviderInput} from '../evidence.js';
import {isZcashEvidence,reviewZcashEvidence} from '../zcashEvidence.js';
import {parseFlow} from '../validate.js';
import {verifySignedReportWeb} from './attestWeb.js';
import {checkSourceRecord} from '../evidence.js';
import type {SignedReport} from '../attest.js';
const VAULT_KEY='veylens-encrypted-case/1',HANDOFF_KEY='veylens-verifier-handoff/1',MAX=2_000_000;
export async function validateStoredInput(raw:unknown):Promise<void>{
 const checked=isCase(raw)?await reviewCase(raw):isProviderInput(raw)?await reviewProviderInput(raw):isZcashEvidence(raw)?await reviewZcashEvidence(raw):parseFlow(raw);
 if(!checked.ok)throw new Error(checked.errors.join(' '));
}
export function initContinuity(restore:(raw:unknown)=>Promise<void>):void{
 const input=document.getElementById('flow-input') as HTMLTextAreaElement|null;if(!document.getElementById('save-local')||!input)return;
 const pass=document.getElementById('case-passphrase') as HTMLInputElement;
 const out=document.getElementById('case-storage-status')!;
 let safeSource='',busy=false,discarded=false,revision=0;
 const say=(text:string)=>{out.textContent=text;};
 const run=(task:()=>Promise<void>)=>{if(busy)return;busy=true;pass.disabled=true;for(const node of document.querySelectorAll<HTMLButtonElement|HTMLInputElement>('[data-vault-control]'))node.disabled=true;void task().catch(e=>say(e instanceof Error?e.message:'Case storage failed.')).finally(()=>{busy=false;pass.disabled=false;pass.value='';for(const node of document.querySelectorAll<HTMLButtonElement|HTMLInputElement>('[data-vault-control]'))node.disabled=false;});};
 const current=()=>{if(!input.value.trim()||new TextEncoder().encode(input.value).length>MAX)throw new Error('Attach a case of up to 2 MB first.');return input.value;};
 const save=async(local:boolean)=>{
  const source=current(),raw=JSON.parse(source);await validateStoredInput(raw);const vault=await encryptCase(source,pass.value);
  if(local){localStorage.setItem(VAULT_KEY,JSON.stringify(vault));say('Encrypted snapshot saved on this device. Later changes require another save.');}
  else{const url=URL.createObjectURL(new Blob([JSON.stringify(vault)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='veylens-encrypted-case.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Encrypted case downloaded. Keep its passphrase separately.');}
  if(input.value===source){safeSource=source;discarded=false;}
 };
 const unlock=async(text:string)=>{if(text.length>3_000_000)throw new Error('Encrypted file exceeds supported size.');const original=input.value,version=++revision,plain=await decryptCase(JSON.parse(text),pass.value);const raw=JSON.parse(plain);await validateStoredInput(raw);if(version!==revision)return;if(input.value!==original)throw new Error('The case changed while unlocking. Retry when the review is idle.');await restore(raw);safeSource=input.value;discarded=false;say('Case restored and independently reviewed locally.');};
 document.getElementById('save-local')!.addEventListener('click',()=>run(()=>save(true)));
 document.getElementById('download-vault')!.addEventListener('click',()=>run(()=>save(false)));
 document.getElementById('unlock-local')!.addEventListener('click',()=>run(async()=>{const text=localStorage.getItem(VAULT_KEY);if(!text)throw new Error('No encrypted case is saved on this device.');await unlock(text);}));
 document.getElementById('forget-local')!.addEventListener('click',()=>{revision++;try{localStorage.removeItem(VAULT_KEY);safeSource='';discarded=false;say('Saved encrypted snapshot removed. The current open case is unchanged.');}catch{say('Browser storage is unavailable.');}});
 document.getElementById('vault-file')!.addEventListener('change',event=>{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;run(async()=>{if(file.size>3_000_000)throw new Error('Encrypted file exceeds supported size.');await unlock(await file.text());});});
 window.addEventListener('veylens-source-exported',()=>{safeSource=input.value;discarded=false;});
 window.addEventListener('veylens-case-cleared',()=>{revision++;safeSource='';discarded=true;});
 window.addEventListener('beforeunload',event=>{if(!discarded&&input.value.trim()&&input.value!==safeSource){event.preventDefault();event.returnValue='';}});
 document.getElementById('open-verifier')!.addEventListener('click',()=>run(async()=>{
  const source=current(),signedText=(document.getElementById('r-signed') as HTMLTextAreaElement).value;
  if(signedText.length>MAX)throw new Error('Report exceeds the 2 MB handoff limit.');const signed=JSON.parse(signedText) as SignedReport;
  if(!(await verifySignedReportWeb(signed)).valid||!(await checkSourceRecord(JSON.parse(source),signed.report)).valid)throw new Error('Review the current evidence again before opening verification.');
  if(input.value!==source||(document.getElementById('r-signed') as HTMLTextAreaElement).value!==signedText)throw new Error('The case changed while preparing verification. Review it again.');
  const record=JSON.stringify({format:'veylens-handoff/1',createdAt:Date.now(),source,report:signedText});
  sessionStorage.setItem(HANDOFF_KEY,record);safeSource=source;discarded=false;window.location.assign('verify.html');
 }));
 try{if(localStorage.getItem(VAULT_KEY))say('An encrypted snapshot is available on this device. Enter its passphrase and unlock it.');}catch{say('Browser storage is unavailable. Encrypted file download and import remain available.');}
}
export function takeVerifierHandoff():{source:string;report:string}|undefined{
 try{const text=sessionStorage.getItem(HANDOFF_KEY);sessionStorage.removeItem(HANDOFF_KEY);if(!text||text.length>4_100_000)return;const r=JSON.parse(text) as {format:string;createdAt:number;source:string;report:string};
  if(r.format!=='veylens-handoff/1'||!Number.isFinite(r.createdAt)||Date.now()<r.createdAt||Date.now()-r.createdAt>120000||typeof r.source!=='string'||typeof r.report!=='string'||r.source.length>MAX||r.report.length>MAX)return;
  return {source:r.source,report:r.report};
 }catch{return;}
}
