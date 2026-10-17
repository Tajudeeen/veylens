import {signCollection,type CollectionReceipt} from '../collection.js';
import {boundedJson} from './http.js';
import {collectTestnet} from './lightwallet.js';
import {nodeRpc,collectInclusion,type NodeConnection} from './node.js';
import {decodeZcashTransaction,type ZcashNetwork} from '../zcash.js';
export interface CollectorEnv {
 COLLECTOR_SIGNING_KEY?:string; ONECLICK_API_KEY?:string; ZEBRA_RPC_URL?:string; ZEBRA_RPC_AUTH?:string; ZEBRA_NETWORK?:string;
 ZCASH_MAINNET_RPC_URL?:string; ZCASH_MAINNET_RPC_AUTH?:string; ZCASH_TESTNET_RPC_URL?:string; ZCASH_TESTNET_RPC_AUTH?:string;
}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function nodeFor(env:CollectorEnv,network:ZcashNetwork):NodeConnection|undefined {
 const url=network==='mainnet'?env.ZCASH_MAINNET_RPC_URL:env.ZCASH_TESTNET_RPC_URL;
 const auth=network==='mainnet'?env.ZCASH_MAINNET_RPC_AUTH:env.ZCASH_TESTNET_RPC_AUTH;
 if(url)return {url,...(auth?{auth}:{})};
 if(env.ZEBRA_RPC_URL&&env.ZEBRA_NETWORK===network)return {url:env.ZEBRA_RPC_URL,...(env.ZEBRA_RPC_AUTH?{auth:env.ZEBRA_RPC_AUTH}:{})};
 return undefined;
}
export async function handleApi(request:Request,env:CollectorEnv,transport:typeof fetch=fetch):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==='/api/capabilities'){
  if(request.method!=='GET')return reply({error:'GET required.'},405);
  return reply({version:'1.0.0',zcashMainnet:true,zcashTestnet:true,source:env.ZEBRA_RPC_URL?'configured-node':'public-sources',oneclickStatus:true,
   collectorSigning:!!env.COLLECTOR_SIGNING_KEY,sources:{mainnet:nodeFor(env,'mainnet')?'configured-node':'public-explorer',testnet:nodeFor(env,'testnet')?'configured-node':'testnet.zec.rocks'},
   blockInclusion:{mainnet:!!nodeFor(env,'mainnet'),testnet:!!nodeFor(env,'testnet')},walletEvidence:'local-export-only'});
 }
 if(request.method!=='POST')return reply({error:'POST required.'},405);
 if(request.headers.get('Origin')!==url.origin)return reply({error:'Same-origin request required.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
 try{
  const raw=await boundedJson(new Response(request.body),4096);if(!obj(raw))throw new Error('Expected a JSON object.');
  const signal=AbortSignal.timeout(15000);let data:unknown;let source:CollectionReceipt['source'];let binding:Record<string,string>;
  if(url.pathname==='/api/oneclick-status'){
   const address=raw['depositAddress'],memo=raw['memo'];if(typeof address!=='string'||address.length<5||address.length>512||/\s/.test(address))throw new Error('Enter a deposit address.');
   if(memo!==undefined&&(typeof memo!=='string'||memo.length>256))throw new Error('Invalid deposit memo.');
   const target=new URL('https://1click.chaindefuser.com/v0/status');target.searchParams.set('depositAddress',address);if(memo)target.searchParams.set('depositMemo',String(memo));
   source='oneclick-status';binding={depositAddress:address,memo:String(memo??'')};
   data=await boundedJson(await transport(target,{signal,headers:env.ONECLICK_API_KEY?{Authorization:`Bearer ${env.ONECLICK_API_KEY}`}:{},redirect:'manual'}));
  }else if(url.pathname==='/api/zcash-transaction'||url.pathname==='/api/zcash-inclusion'){
   const txid=raw['txid'],network=raw['network'];if(typeof txid!=='string'||!/^[a-f\d]{64}$/i.test(txid))throw new Error('Enter a 64-character transaction ID.');
   if(network!=='mainnet'&&network!=='testnet')throw new Error('Choose a network.');
   const normalized=txid.toLowerCase();binding={txid:normalized,network};const node=nodeFor(env,network);
   if(url.pathname==='/api/zcash-inclusion'){
    if(!node)throw new Error('Source block inclusion requires a configured full node. Import a portable proof instead.');
    data=await collectInclusion(node,normalized,network,transport,signal);source='configured-node-inclusion';
   }else if(node){
    const result=await nodeRpc(node,'getrawtransaction',[normalized,0],transport,signal);
    if(typeof result!=='string')throw new Error('Node returned no raw transaction.');data={txid:normalized,hex:result};source='configured-node';
   }else if(network==='testnet'){
    const result=await collectTestnet(normalized,transport,signal);source='testnet-lightwallet';
    return reply({...result,...(env.COLLECTOR_SIGNING_KEY?{receipt:await signCollection(result.data,source,binding,env.COLLECTOR_SIGNING_KEY),observationReceipt:await signCollection(result.observation,'testnet-lightwallet-observation',binding,env.COLLECTOR_SIGNING_KEY)}:{})});
   }else{
    // Legacy single-network configuration remains strict. Explicit per-network URLs allow both nodes.
    if(env.ZEBRA_RPC_URL&&!env.ZCASH_MAINNET_RPC_URL)throw new Error('Choose the configured node network.');
    const result=await boundedJson(await transport(`https://api.zecblock.com/v1/transactions/${normalized}/raw`,{signal,redirect:'manual'}));
    if(!obj(result)||!obj(result['data'])||typeof result['data']['hex']!=='string')throw new Error('Explorer returned no raw transaction.');data={txid:normalized,hex:result['data']['hex']};source='zcash-explorer';
   }
   if(url.pathname==='/api/zcash-transaction'){
    const record=data as {txid:string;hex:string};if(decodeZcashTransaction(record.hex,network).txid!==normalized)throw new Error('Source transaction ID mismatch.');
   }
  }else return reply({error:'Unknown endpoint.'},404);
  return reply({data,...(env.COLLECTOR_SIGNING_KEY?{receipt:await signCollection(data,source,binding,env.COLLECTOR_SIGNING_KEY)}:{})});
 }catch(e){const safe=e instanceof Error&&/^(Enter|Choose|Invalid|Expected|Testnet|Source|Node returned|Explorer returned)/.test(e.message)?e.message:'Lookup failed. Retry or import a local export.';return reply({error:safe},400);}
}
