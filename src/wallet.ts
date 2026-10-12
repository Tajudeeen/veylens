/** Local z_viewtransaction export inspection. Values remain wallet assertions. */
export function inspectWalletExport(raw:unknown):{txid:string;spends:number;outputs:number;pools:string[];reportedRecipients:number;notice:string}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Expected z_viewtransaction JSON.');
 const root=raw as Record<string,unknown>;const data=(root['result']??root) as Record<string,unknown>;
 if(!data||typeof data['txid']!=='string'||!/^[\da-f]{64}$/i.test(data['txid'])||!Array.isArray(data['spends'])||!Array.isArray(data['outputs']))throw new Error('Expected txid, spends and outputs from z_viewtransaction.');
 if(data['spends'].length+data['outputs'].length>10000)throw new Error('Wallet export exceeds supported size.');
 const pools=new Set<string>();let recipients=0;
 for(const item of [...data['spends'],...data['outputs']]){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Invalid wallet entry.');const row=item as Record<string,unknown>;
  if(!['sprout','sapling','orchard'].includes(String(row['pool'])))throw new Error('Unsupported wallet pool.');pools.add(String(row['pool']));
  if(row['address']!==undefined&&typeof row['address']!=='string')throw new Error('Invalid wallet recipient.');
 }
 for(const item of data['outputs'])if(typeof (item as Record<string,unknown>)['address']==='string')recipients++;
 return {txid:data['txid'].toLowerCase(),spends:data['spends'].length,outputs:data['outputs'].length,pools:[...pools],reportedRecipients:recipients,notice:'Wallet-reported export only. Not authenticated, proof-validated or attributed to a swap. Memos and keys are not included in this summary.'};
}
