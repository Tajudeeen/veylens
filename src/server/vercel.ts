import {isIP} from 'node:net';
import {handleApi,type CollectorEnv} from './api.js';
import {limitCollection} from './limits.js';
type RuntimeEnv=NodeJS.ProcessEnv;
export function vercelEnvironment(runtime:RuntimeEnv):CollectorEnv{
 const names=['COLLECTOR_KEY_ID','COLLECTOR_SIGNING_KEY','COLLECTOR_RATE_SECRET','BUDGET_GATEWAY_URL','BUDGET_GATEWAY_SECRET','ONECLICK_API_KEY','TESTNET_SOURCE','ZCASH_MAINNET_RPC_URL','ZCASH_MAINNET_RPC_AUTH','ZCASH_TESTNET_RPC_URL','ZCASH_TESTNET_RPC_AUTH','ZEBRA_RPC_URL','ZEBRA_RPC_AUTH','ZEBRA_NETWORK'] as const;
 const env:CollectorEnv={};for(const name of names){const value=runtime[name];if(value!==undefined)env[name]=value;}return env;
}
/** Vercel overwrites X-Forwarded-For. Never trust a browser-supplied Cloudflare header. */
export async function handleVercelApi(request:Request,runtime:RuntimeEnv=process.env,transport:typeof fetch=fetch,budgetTransport:typeof fetch=fetch):Promise<Response>{
 const headers=new Headers(request.headers);headers.delete('CF-Connecting-IP');
 const ip=headers.get('X-Forwarded-For');
 if(runtime['VERCEL']==='1'&&ip&&isIP(ip))headers.set('CF-Connecting-IP',ip);
 return handleApi(new Request(request,{headers}),vercelEnvironment(runtime),transport,(input,env,cost)=>limitCollection(input,env,cost,Date.now(),budgetTransport));
}
export default {fetch:(request:Request)=>handleVercelApi(request)};
