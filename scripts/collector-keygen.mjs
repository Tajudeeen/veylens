// Writes a private key to a new, permission-restricted file. Prints public metadata only.
import {generateKeyPairSync} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const [id,filename,...rest]=process.argv.slice(2);
if(!id||!filename||rest.length||!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id))throw new Error('Use npm run collector:keygen -- key-id /private/path/key.pkcs8');
const pair=generateKeyPairSync('ed25519');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64')+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({keyId:id,privateKeyFile:path,publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64'),status:'active',notBefore:new Date().toISOString(),next:'Add the public entry to src/collectorKeys.ts and deploy the verifier before changing the runtime signer. Retain historical keys.'},null,2));
