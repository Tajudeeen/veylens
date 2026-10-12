export interface CollectorEnv { ONECLICK_API_KEY?:string; ZEBRA_RPC_URL?:string; ZEBRA_RPC_AUTH?:string; ZEBRA_NETWORK?:string }
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function bounded(response:Response,max=2_000_000):Promise<unknown>{
 if(!response.ok)throw new Error('Source unavailable or identifier not found.');
 const reader=response.body?.getReader();if(!reader)throw new Error('Empty source response.');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max)throw new Error('Source response exceeds supported size.');chunks.push(part.value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export async function handleApi(request:Request,env:CollectorEnv,transport:typeof fetch=fetch):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname==='/api/capabilities')return reply({zcashMainnet:!env.ZEBRA_RPC_URL||env.ZEBRA_NETWORK==='mainnet',zcashTestnet:!!env.ZEBRA_RPC_URL&&env.ZEBRA_NETWORK==='testnet',source:env.ZEBRA_RPC_URL?'configured-node':'public-explorer',oneclickStatus:true});
 if(request.method!=='POST')return reply({error:'POST required.'},405);
 if(request.headers.get('Origin')!==url.origin)return reply({error:'Same-origin request required.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
 try{
  const raw=await bounded(new Response(request.body),4096);if(!obj(raw))throw new Error('Expected a JSON object.');
  const signal=AbortSignal.timeout(15000);let data:unknown;
  if(url.pathname==='/api/oneclick-status'){
   const address=raw['depositAddress'],memo=raw['memo'];if(typeof address!=='string'||address.length<5||address.length>512||/\s/.test(address))throw new Error('Enter a deposit address.');
   if(memo!==undefined&&(typeof memo!=='string'||memo.length>256))throw new Error('Invalid deposit memo.');
   const target=new URL('https://1click.chaindefuser.com/v0/status');target.searchParams.set('depositAddress',address);if(memo)target.searchParams.set('depositMemo',String(memo));
   data=await bounded(await transport(target,{signal,headers:env.ONECLICK_API_KEY?{Authorization:`Bearer ${env.ONECLICK_API_KEY}`}:{},redirect:'manual'}));
  }else if(url.pathname==='/api/zcash-transaction'){
   const txid=raw['txid'],network=raw['network'];if(typeof txid!=='string'||!/^[a-f\d]{64}$/i.test(txid))throw new Error('Enter a 64-character transaction ID.');
   if(network!=='mainnet'&&network!=='testnet')throw new Error('Choose a network.');
   if(env.ZEBRA_RPC_URL){
    if(env.ZEBRA_NETWORK!==network)throw new Error("Choose the configured node network.");
    const result=await bounded(await transport(env.ZEBRA_RPC_URL,{method:'POST',signal,redirect:'manual',headers:{'Content-Type':'application/json',...(env.ZEBRA_RPC_AUTH?{Authorization:env.ZEBRA_RPC_AUTH}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getrawtransaction',params:[txid,0]})}));
    if(!obj(result)||result['error']||typeof result['result']!=='string')throw new Error('Node returned no raw transaction.');data={txid:txid.toLowerCase(),hex:result['result']};
   }else{
    if(network!=='mainnet')throw new Error('Testnet requires a configured node.');
    const result=await bounded(await transport(`https://api.zecblock.com/v1/transactions/${txid.toLowerCase()}/raw`,{signal,redirect:'manual'}));
    if(!obj(result)||!obj(result['data'])||typeof result['data']['hex']!=='string')throw new Error('Explorer returned no raw transaction.');data={txid:txid.toLowerCase(),hex:result['data']['hex']};
   }
  }else return reply({error:'Unknown endpoint.'},404);
  return reply({data});
 }catch(e){const safe=e instanceof Error&&/^(Enter|Choose|Invalid|Expected|Testnet|Source|Node returned|Explorer returned)/.test(e.message)?e.message:'Lookup failed. Retry or import a local export.';return reply({error:safe},400);}
}
