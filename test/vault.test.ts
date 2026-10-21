import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptCase,decryptCase} from '../src/web/vault.js';
import {JSDOM} from 'jsdom';
import {takeVerifierHandoff} from '../src/web/continuity.js';
test('encrypted cases authenticate every byte, reject wrong passphrases and bound KDF work',async()=>{
 const source=JSON.stringify({format:'test',address:'private-local-address'}),pass='separate test passphrase';const vault=await encryptCase(source,pass);assert.ok(!JSON.stringify(vault).includes('private-local-address'));assert.equal(await decryptCase(vault,pass),source);
 await assert.rejects(decryptCase(vault,'incorrect test passphrase'));await assert.rejects(decryptCase({...vault,ciphertext:(vault.ciphertext[0]==='A'?'B':'A')+vault.ciphertext.slice(1)},pass));await assert.rejects(decryptCase({...vault,iterations:9_999_999_999},pass));await assert.rejects(encryptCase(source,'short'));await assert.rejects(encryptCase('x'.repeat(2_000_001),pass));
});
test('one-time verifier handoffs are consumed even when expired or malformed',()=>{
 const dom=new JSDOM('',{url:'https://veylens.test'});Object.defineProperty(globalThis,'sessionStorage',{value:dom.window.sessionStorage,configurable:true});
 const key='veylens-verifier-handoff/1';sessionStorage.setItem(key,JSON.stringify({format:'veylens-handoff/1',createdAt:Date.now(),source:'{}',report:'{}'}));assert.deepEqual(takeVerifierHandoff(),{source:'{}',report:'{}'});assert.equal(sessionStorage.getItem(key),null);assert.equal(takeVerifierHandoff(),undefined);
 for(const value of ['bad',JSON.stringify({format:'veylens-handoff/1',createdAt:0,source:'{}',report:'{}'})]){sessionStorage.setItem(key,value);assert.equal(takeVerifierHandoff(),undefined);assert.equal(sessionStorage.getItem(key),null);}delete (globalThis as {sessionStorage?:Storage}).sessionStorage;dom.window.close();
});
