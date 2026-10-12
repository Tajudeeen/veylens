/** Public, read-only capture. The explorer sees the requested public transaction ID. */
import {writeFile} from 'node:fs/promises';
import {decodeZcashTransaction} from '../dist/src/zcash.js';
const txid=process.argv[2];const out=process.argv[3];
if(!/^[a-fA-F0-9]{64}$/.test(txid??'')||!out) throw new Error('usage: node scripts/capture-zcash.mjs <public-mainnet-txid> <new-output.json>');
const source=`https://api.zecblock.com/v1/transactions/${txid.toLowerCase()}/raw`;
const response=await fetch(source,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`Explorer returned HTTP ${response.status}`);
const body=await response.json();
if(body.meta?.network!=='mainnet')throw new Error('Explorer did not identify mainnet.');
const payload=body.data;
const decoded=decodeZcashTransaction(payload.hex,'mainnet');
if(decoded.txid!==txid.toLowerCase()||payload.txid.toLowerCase()!==decoded.txid)throw new Error('Raw bytes disagree with requested transaction ID.');
await writeFile(out,JSON.stringify({format:'veylens-zcash-evidence/1',network:'mainnet',transactions:[{txid:decoded.txid,hex:payload.hex}],observation:{source,observedAt:body.meta.generatedAt,purpose:'Public explorer observation, not independent confirmation or refund attribution.'}},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Saved ID-checked public transaction evidence. No wallet, signing, or broadcast operation was used.');
