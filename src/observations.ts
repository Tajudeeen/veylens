import type {ZcashNetwork} from './zcash.js';

export function inspectExplorerObservation(raw:unknown,txid:string,network:ZcashNetwork):{height:number;confirmations:number;blockHash:string|null}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid explorer observation.');const r=raw as Record<string,unknown>;
 if(r['format']!=='veylens-explorer-observation/1'||r['network']!==network||network!=='testnet'||r['txid']!==txid||r['source']!=='api.testnet.zecblock.com'||
  !Number.isSafeInteger(r['reportedHeight'])||Number(r['reportedHeight'])<0||!Number.isSafeInteger(r['sourceTipHeight'])||Number(r['sourceTipHeight'])<1||Number(r['sourceTipHeight'])<Number(r['reportedHeight']))throw new Error('Invalid explorer observation binding or height.');
 const height=Number(r['reportedHeight']);
 if(height&&(typeof r['blockHash']!=='string'||!/^[a-f0-9]{64}$/.test(r['blockHash'])))throw new Error('Invalid explorer block hash.');
 if(!height&&r['blockHash']!==undefined)throw new Error('Mempool observation cannot include a mined block.');
 return {height,confirmations:height?Number(r['sourceTipHeight'])-height+1:0,blockHash:height?String(r['blockHash']):null};
}

/** A compact block is a source assertion. Its txid list is not a Merkle proof. */
export function inspectLightwalletObservation(raw:unknown,txid:string,network:ZcashNetwork):{height:number;confirmations:number;blockHash:string|null} {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid lightwallet observation.');
  const r=raw as Record<string,unknown>;
  if(r['format']!=='veylens-lightwallet-observation/1'||r['network']!==network||network!=='testnet'||r['txid']!==txid||r['source']!=='testnet.zec.rocks'||
    typeof r['branchId']!=='string'||!/^[a-f0-9]{8}$/.test(r['branchId'])||!Number.isSafeInteger(r['reportedHeight'])||Number(r['reportedHeight'])<0||
    !Number.isSafeInteger(r['sourceTipHeight'])||Number(r['sourceTipHeight'])<1||Number(r['sourceTipHeight'])<Number(r['reportedHeight']))throw new Error('Invalid lightwallet observation binding or height.');
  const height=Number(r['reportedHeight']);
  if(!height){if(r['compactTxids']!==undefined||r['blockHash']!==undefined||r['blockTime']!==undefined)throw new Error('Mempool observation cannot include a mined block.');return {height:0,confirmations:0,blockHash:null};}
  if(typeof r['blockHash']!=='string'||!/^[a-f0-9]{64}$/.test(r['blockHash'])||!Number.isSafeInteger(r['blockTime'])||Number(r['blockTime'])<0||
    !Array.isArray(r['compactTxids'])||r['compactTxids'].length>100_000||!r['compactTxids'].every(t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t))||
    new Set(r['compactTxids']).size!==r['compactTxids'].length||!r['compactTxids'].includes(txid))throw new Error('Invalid compact-block membership observation.');
  return {height,confirmations:Number(r['sourceTipHeight'])-height+1,blockHash:r['blockHash']};
}
