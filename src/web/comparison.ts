import {reviewCase,compareCaseReports} from '../case.js';
import type {Report} from '../types.js';

/** Two independent local reviews. Imported data never enters browser storage. */
export function initComparison():void{
 const button=document.getElementById('compare-run') as HTMLButtonElement|null;
 if(!button)return;
 const reports:Partial<Record<'before'|'after',Report>>={};
 const revisions={before:0,after:0};
 const output=document.getElementById('comparison-output')!;
 const download=document.getElementById('compare-download') as HTMLButtonElement;
 let exported:unknown;
 const resetOutput=()=>{output.hidden=true;download.hidden=true;exported=undefined;};
 const refresh=()=>{button.disabled=!reports.before||!reports.after;};
 for(const side of ['before','after'] as const){
  const input=document.getElementById(`compare-${side}`) as HTMLInputElement;
  const status=document.getElementById(`compare-${side}-status`)!;
  input.addEventListener('change',()=>{
   const revision=++revisions[side];delete reports[side];resetOutput();refresh();
   const file=input.files?.[0];if(!file){status.textContent='No case attached.';return;}
   status.textContent='Checking the supplied evidence…';status.removeAttribute('data-state');
   void(async()=>{try{
    if(file.size>2_000_000)throw new Error('Case file exceeds 2 MB.');
    const checked=await reviewCase(JSON.parse(await file.text()));
    if(!checked.ok)throw new Error(checked.errors.join(' '));
    if(revision!==revisions[side])return;
    reports[side]=checked.report;
    const high=checked.report.findings.filter(f=>f.severity==='high').length;
    status.textContent=`Reviewed locally. ${checked.report.findings.length} findings, ${high} high severity. Evidence remains incomplete.`;status.dataset.state='ok';
   }catch(e){if(revision!==revisions[side])return;status.textContent=e instanceof Error?e.message:'Could not review this case.';status.dataset.state='bad';}finally{refresh();}})();
  });
 }
 const fill=(id:string,items:string[],empty:string)=>{
  const list=document.getElementById(id)!;list.replaceChildren(...(items.length?items:[empty]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 };
 button.addEventListener('click',()=>{
  if(!reports.before||!reports.after)return;
  const compared=compareCaseReports(reports.before,reports.after);
  fill('compare-removed',compared.removed,'No findings removed.');fill('compare-added',compared.added,'No findings added.');fill('compare-remaining',compared.remaining,'No shared findings.');fill('compare-warnings',compared.evidenceWarnings,'No additional evidence gaps identified. Existing evidence limits still apply.');
  for(const name of ['removed','added','remaining'] as const)document.getElementById(`compare-${name}-count`)!.textContent=String(compared[name].length);
  document.getElementById('compare-notice')!.textContent=compared.notice;
  exported={format:'veylens-case-comparison/1',beforeInputDigest:reports.before.evidence?.inputDigest,afterInputDigest:reports.after.evidence?.inputDigest,...compared};
  output.hidden=false;download.hidden=false;output.focus({preventScroll:true});output.scrollIntoView?.({block:'start',behavior:'smooth'});
 });
 document.getElementById('compare-clear')!.addEventListener('click',()=>{
  for(const side of ['before','after'] as const){revisions[side]++;delete reports[side];(document.getElementById(`compare-${side}`) as HTMLInputElement).value='';const status=document.getElementById(`compare-${side}-status`)!;status.textContent='No case attached.';status.removeAttribute('data-state');}
  resetOutput();refresh();
 });
 download.addEventListener('click',()=>{
  if(!exported)return;const url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='veylens-case-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
