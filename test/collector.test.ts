import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from '../src/server/api.js';
import {inspectWalletExport} from '../src/wallet.js';
const req=(path:string,body:unknown,origin='https://veylens.test')=>new Request(`https://veylens.test${path}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('collector rejects cross-origin and invalid IDs without upstream requests',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;return Response.json({});};
 assert.equal((await handleApi(req('/api/zcash-transaction',{},'https://other.test'),{},transport)).status,403);
 assert.equal((await handleApi(req('/api/zcash-transaction',{txid:'https://internal',network:'mainnet'}),{},transport)).status,400);assert.equal(calls,0);
});
test('collector fixes explorer URL and returns real source bytes',async()=>{
 const id='a'.repeat(64);let target='';const transport:typeof fetch=async input=>{target=String(input);return Response.json({data:{hex:'010203'}});};
 const response=await handleApi(req('/api/zcash-transaction',{txid:id,network:'mainnet',url:'http://internal'}),{},transport);
 assert.equal(response.status,200);assert.equal(target,`https://api.zecblock.com/v1/transactions/${id}/raw`);assert.deepEqual(await response.json(),{data:{txid:id,hex:'010203'}});
});
test('collector source errors never return fixture data or secrets',async()=>{
 const transport:typeof fetch=async()=>{throw new Error('secret-token');};const response=await handleApi(req('/api/oneclick-status',{depositAddress:'deposit-address'}),{},transport);
 assert.equal(response.status,400);assert.ok(!(await response.text()).includes('secret-token'));
});
test('configured node requires explicit matching network',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;return Response.json({});};
 assert.equal((await handleApi(req('/api/zcash-transaction',{txid:'a'.repeat(64),network:'mainnet'}),{ZEBRA_RPC_URL:'https://node.test',ZEBRA_NETWORK:'testnet'},transport)).status,400);assert.equal(calls,0);
});
test('wallet summary preserves assertion boundary and omits memos and addresses',()=>{
 const summary=inspectWalletExport({txid:'a'.repeat(64),spends:[],outputs:[{pool:'orchard',address:'private-address',memo:'private-memo'}]});
 assert.equal(summary.reportedRecipients,1);assert.ok(!JSON.stringify(summary).includes('private-'));assert.throws(()=>inspectWalletExport({txid:'a'.repeat(64),spends:[],outputs:[{pool:'unknown'}]}));
});
test('collector uses edge-compatible manual redirects and rejects redirect responses',async()=>{
 const transport:typeof fetch=async(_input,init)=>{assert.equal(init?.redirect,'manual');return new Response(null,{status:302,headers:{Location:'http://internal'}});};
 const response=await handleApi(req('/api/zcash-transaction',{txid:'a'.repeat(64),network:'mainnet'}),{},transport);assert.equal(response.status,400);assert.ok(!(await response.text()).includes('internal'));
});
