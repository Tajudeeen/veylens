import {digestInput,reviewProviderInput,stableJson,type EvidenceResult} from './evidence.js';
import {reviewZcashEvidence} from './zcashEvidence.js';
import {decodeZcashTransaction,type ZcashNetwork,type DecodedZcash} from './zcash.js';
import {inspectReceiver} from './receivers.js';
import {verifyCollection,type CollectionReceipt} from './collection.js';
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-f\d]{64}$/i.test(x);
export function isCase(raw:unknown):boolean{return obj(raw)&&raw['format']==='veylens-case/1';}
export function findRefundCandidates(transactions:DecodedZcash[],hashes:Set<string>,addresses:string[],amount:bigint,shieldingTxid?:string):DecodedZcash[]{
 return transactions.filter(tx=>hashes.has(tx.txid)&&tx.txid!==shieldingTxid&&amount>0n&&addresses.some(a=>tx.outputs.filter(o=>o.address===a).reduce((n,o)=>n+BigInt(o.valueZat),0n)===amount));
}
/** Establishes public relationships without equating provider observation with consensus. */
export async function reviewCase(raw:unknown,now=Math.floor(Date.now()/1000)):Promise<EvidenceResult>{
 if(!isCase(raw)||!obj(raw))return {ok:false,errors:['Expected veylens-case/1.']};
 const network=raw['network'];if(network!=='mainnet'&&network!=='testnet')return {ok:false,errors:['Choose mainnet or testnet.']};
 const rows=raw['transactions'];if(!Array.isArray(rows)||rows.length>20)return {ok:false,errors:['At most 20 transaction records are supported.']};
 const records=new Map<string,{txid:string;hex:string;receipt?:unknown}>();
 for(const row of rows){if(!obj(row)||!id(row['txid'])||typeof row['hex']!=='string'||records.has(row['txid'].toLowerCase()))return {ok:false,errors:['Each transaction needs a unique ID and raw hex.']};records.set(row['txid'].toLowerCase(),{txid:row['txid'].toLowerCase(),hex:row['hex'],...(row['receipt']?{receipt:row['receipt']}:{})});}
 let providerReport:Awaited<ReturnType<typeof reviewProviderInput>>|undefined;
 let quote:Record<string,unknown>|undefined,details:Record<string,unknown>|undefined;
 if(raw['provider']!==undefined){if(network!=='mainnet')return {ok:false,errors:['1Click Zcash cases require mainnet.']};providerReport=await reviewProviderInput(raw['provider'],now);if(!providerReport.ok)return providerReport;
  const p=raw['provider'] as Record<string,unknown>;quote=(obj(p['quoteResponse'])?p['quoteResponse']:p);details=obj(p['swapDetails'])?p['swapDetails']:undefined;}
 const request=quote&&obj(quote['quoteRequest'])?quote['quoteRequest']:undefined;
 let refundTo=typeof raw['refundTo']==='string'?raw['refundTo']:undefined;
 const configured=request?.['refundType']==='ORIGIN_CHAIN'&&typeof request['refundTo']==='string'?request['refundTo']:undefined;
 if(configured&&refundTo&&configured!==refundTo)return {ok:false,errors:['Refund destination conflicts with provider configuration.']};refundTo=configured??refundTo;
 let transparent:string[]=[];let receiver='unknown';
 if(refundTo){try{const decoded=inspectReceiver(refundTo,network as ZcashNetwork);transparent=decoded.receivers.flatMap(r=>r.transparentAddress?[r.transparentAddress]:[]);receiver=decoded.receivers.map(r=>r.kind).join(', ');}catch{return {ok:false,errors:['Refund destination is not a supported checksum-valid address for this network.']};}}
 const decoded=new Map<string,ReturnType<typeof decodeZcashTransaction>>();
 try{for(const row of records.values()){const tx=decodeZcashTransaction(row.hex,network);if(tx.txid!==row.txid)return {ok:false,errors:['Transaction bytes do not match supplied ID.']};decoded.set(tx.txid,tx);}}catch(e){return {ok:false,errors:[e instanceof Error?e.message:'Invalid transaction.']};}
 for(const key of ['shieldingTxid','refundTxid'])if(raw[key]!==undefined&&(!id(raw[key])||!records.has(raw[key].toLowerCase())))return {ok:false,errors:[`${key} must refer to a collected transaction.`]};
 const hashes=new Set((Array.isArray(details?.['originChainTxHashes'])?details['originChainTxHashes']:[]).flatMap((r:unknown)=>obj(r)&&id(r['hash'])?[r['hash'].toLowerCase()]:[]));
 const amount=typeof details?.['refundedAmount']==='string'&&/^[0-9]{1,100}$/.test(details['refundedAmount'])?BigInt(details['refundedAmount']):0n;
 const candidates=findRefundCandidates([...decoded.values()],hashes,transparent,amount,typeof raw['shieldingTxid']==='string'?raw['shieldingTxid'].toLowerCase():undefined);
 // All origin-chain hashes can include deposits. Require exact destination and aggregate amount, never hash membership alone.
 const automatic=request?.['dry']===false&&providerReport?.ok&&providerReport.report.evidence?.quoteSignature==='valid'&&candidates.length===1?candidates[0]:undefined;
 const refundId=typeof raw['refundTxid']==='string'?raw['refundTxid'].toLowerCase():automatic?.txid;
 const matchingAddress=refundId?transparent.find(a=>decoded.get(refundId)!.outputs.some(o=>o.address===a&&BigInt(o.valueZat)>0n)):undefined;
 let result:EvidenceResult;
 if(rows.length){result=await reviewZcashEvidence({format:'veylens-zcash-evidence/1',network,transactions:[...records.values()].map(r=>({txid:r.txid,hex:r.hex})),...(raw['shieldingTxid']?{shieldingTxid:raw['shieldingTxid']} :{}),...(refundId&&matchingAddress?{refundTxid:refundId,refundTo:matchingAddress}:{})},now);}
 else if(providerReport?.ok)result=providerReport;
 else return {ok:false,errors:['Import a provider record or at least one transaction.']};
 if(!result.ok)return result;
 const report=result.report,evidence=report.evidence!;
 if(refundId)report.flowId=refundId;
 if(refundId&&refundTo&&!matchingAddress){
  evidence.gaps=evidence.gaps.filter(g=>!g.startsWith('No refund transaction/destination pair was supplied.'));
  if(transparent.length)evidence.gaps.push('The selected refund transaction has no positive transparent output to the configured receiver.');
 }
 if(rows.length&&providerReport?.ok){report.findings.push(...providerReport.report.findings);evidence.facts.push(...providerReport.report.evidence!.facts.map(f=>({...f,path:'provider.'+f.path})));evidence.quoteSignature=providerReport.report.evidence!.quoteSignature!;}
 let collectedProvider=false;
 if(raw['providerReceipt']!==undefined){const lookup=raw['providerLookup'];if(!obj(lookup)||typeof lookup['depositAddress']!=='string'||typeof lookup['memo']!=='string'||!await verifyCollection(raw['provider'],raw['providerReceipt'],'oneclick-status',{depositAddress:lookup['depositAddress'],memo:lookup['memo']}))return {ok:false,errors:['Provider collection receipt is invalid or bound to different data.']};collectedProvider=true;}
 let collected=0;
 for(const row of records.values())if(row.receipt!==undefined){const receipt=row.receipt as CollectionReceipt;const source=receipt.source;if(!['zcash-explorer','configured-node'].includes(source)||!await verifyCollection({txid:row.txid,hex:row.hex},receipt,source,{txid:row.txid,network}))return {ok:false,errors:['Transaction collection receipt is invalid.']};collected++;}
 const association=automatic&&refundId===automatic.txid?'provider-reported candidate matched by ID, destination and exact amount':refundId?'user-declared transaction role':'not established';
 evidence.facts.push({path:'case.providerOrigin',value:collectedProvider?'Collector-authenticated status observation':'Imported provider record; outer status not authenticated',trust:collectedProvider?'pinned-collector-signature':'unverified-import'},
 {path:'case.rawRecords',value:`${records.size} ID-matched, ${collected} collector-authenticated observations`,trust:'content-and-collection-checks'},
 {path:'case.refundReceiver',value:receiver,trust:'checksum-and-receiver-decoding'},
 {path:'case.refundAssociation',value:association,trust:automatic?'provider-reported-plus-raw-output-match':'user-assertion-or-missing'},
 {path:'case.refundCandidates',value:String(candidates.length),trust:'exact-amount-and-address-comparison'},
 {path:'case.shieldingSource',value:raw['shieldingTxid']?String(raw['shieldingTxid']):'Not supplied',trust:'user-selected-role; source-prevouts-checked-locally'});
 if(refundId)evidence.facts.push({path:'case.refundTransaction',value:refundId,trust:association});
 evidence.gaps.push('Provider reporting and collector signatures do not prove provider honesty, canonical-chain inclusion or shared wallet ownership.');
 if(!automatic)evidence.gaps.push(candidates.length>1?'Multiple exact refund candidates exist. Attribution is ambiguous.':'No unique provider-reported refund candidate is established.');
 if(!raw['shieldingTxid'])evidence.gaps.push('Supply the shielding transaction to inspect source-address reuse.');
 if(request?.['dry']===true)evidence.gaps.push('A dry quote cannot establish executed refunds.');
 if(refundTo&&!transparent.length)evidence.gaps.push('Shielded refund delivery cannot be established from public transaction bytes alone.');
 for(const rule of new Set(report.findings.map(f=>f.ruleId))){const remedy=rule.includes('reuse')?'Use a fresh supported refund destination that is not a shielding source, and test the actual refund path.':rule.includes('transparent')?'Prefer an integration-supported shielded refund path. Verify actual delivery; an address encoding alone is insufficient.':'Resolve the authenticity or configuration issue before relying on this record.';evidence.facts.push({path:`remedy.${rule}`,value:remedy,trust:'engineering-recommendation'});}
 evidence.format='veylens-case-report/1';evidence.inputDigest=await digestInput(raw);evidence.gaps=[...new Set(evidence.gaps)];evidence.scope='Combined refund-path review: authenticated configuration, checked public relationships and explicit attribution boundaries';
 report.rulesetVersion='case-review/1.1.0';report.overallResult=report.findings.some(f=>f.severity==='high')?'fail':'insufficient';return {ok:true,report};
}
export function compareCaseReports(before:{findings:Array<{ruleId:string;severity:string}>;evidence?:{gaps:string[];facts:Array<{path:string;value:string}>;quoteSignature?:string}},after:{findings:Array<{ruleId:string;severity:string}>;evidence?:{gaps:string[];facts:Array<{path:string;value:string}>;quoteSignature?:string}}):{removed:string[];added:string[];remaining:string[];evidenceWarnings:string[];notice:string}{
 const a=new Set(before.findings.map(f=>f.ruleId)),b=new Set(after.findings.map(f=>f.ruleId));
 const evidenceWarnings=(after.evidence?.gaps??[]).filter(g=>!(before.evidence?.gaps??[]).includes(g));
 if(before.evidence?.quoteSignature==='valid'&&after.evidence?.quoteSignature!=='valid')evidenceWarnings.push('The corrected case no longer has authenticated quote configuration.');
 const count=(report:typeof before)=>Number.parseInt(report.evidence?.facts.find(f=>f.path==='case.rawRecords')?.value??'0',10);
 if(count(after)<count(before))evidenceWarnings.push('The corrected case contains fewer raw transaction records. Missing evidence can remove findings.');
 return {removed:[...a].filter(r=>!b.has(r)),added:[...b].filter(r=>!a.has(r)),remaining:[...b].filter(r=>a.has(r)),evidenceWarnings,notice:'Comparison covers the supplied cases only. Missing findings do not establish privacy or equivalent evidence coverage.'};
}
