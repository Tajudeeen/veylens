import {decodeZcashTransaction} from '../zcash.js';
import {boundedJson} from './http.js';
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function envelope(raw:unknown):{data:Record<string,unknown>;height:number}{
 if(!object(raw)||!object(raw['data'])||!object(raw['meta'])||raw['meta']['network']!=='testnet'||!Number.isSafeInteger(raw['meta']['indexedHeight'])||Number(raw['meta']['indexedHeight'])<1)throw new Error('Source returned invalid testnet explorer metadata.');
 return {data:raw['data'],height:Number(raw['meta']['indexedHeight'])};
}
export async function collectTestnetExplorer(txid:string,transport:typeof fetch,signal:AbortSignal){
 const root='https://api.testnet.zecblock.com/v1/transactions/';
 const [raw,status]=await Promise.all([transport(root+txid+'/raw',{signal,redirect:'manual'}).then(r=>boundedJson(r)),transport(root+txid,{signal,redirect:'manual'}).then(r=>boundedJson(r))]);
 const bytes=envelope(raw),state=envelope(status);
 if(bytes.data['txid']!==txid||typeof bytes.data['hex']!=='string'||decodeZcashTransaction(bytes.data['hex'],'testnet').txid!==txid||state.data['txid']!==txid)throw new Error('Source transaction ID mismatch.');
 const heightValue=state.data['blockHeight'];const reportedHeight=heightValue===null||heightValue===undefined?0:Number(heightValue);
 if(!Number.isSafeInteger(reportedHeight)||reportedHeight<0||reportedHeight>state.height)throw new Error('Source returned an invalid mined height.');
 if(reportedHeight&&(!id(state.data['blockHash'])||state.data['isCanonical']!==true))throw new Error('Source transaction is not reported in its canonical chain.');
 const observation={format:'veylens-explorer-observation/1' as const,network:'testnet' as const,txid,source:'api.testnet.zecblock.com' as const,
  reportedHeight,sourceTipHeight:state.height,...(reportedHeight?{blockHash:String(state.data['blockHash'])}:{})};
 return {data:{txid,hex:bytes.data['hex']},observation};
}
