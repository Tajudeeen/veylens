const MAX_BYTES=2_000_000,ITERATIONS=310_000;
export interface CaseVault {format:'veylens-vault/1';kdf:'PBKDF2-SHA256';iterations:number;salt:string;iv:string;ciphertext:string}
const b64=(b:Uint8Array):string=>{let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s);};
const bytes=(s:unknown,max:number):Uint8Array<ArrayBuffer>=>{if(typeof s!=='string'||s.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw new Error('Invalid encrypted case.');const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(b.length>max)throw new Error('Encrypted case is too large.');return b;};
async function key(passphrase:string,salt:Uint8Array<ArrayBuffer>,iterations:number):Promise<CryptoKey>{
 if(passphrase.length<10||passphrase.length>1024)throw new Error('Use a passphrase of 10 to 1024 characters.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=new TextEncoder().encode('veylens-vault/1:PBKDF2-SHA256:310000');
export async function encryptCase(source:string,passphrase:string):Promise<CaseVault>{
 const input=new TextEncoder().encode(source);if(!input.length||input.length>MAX_BYTES)throw new Error('Case must contain at most 2 MB of JSON.');JSON.parse(source);
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await key(passphrase,salt,ITERATIONS),input));
 return {format:'veylens-vault/1',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(ciphertext)};
}
export async function decryptCase(raw:unknown,passphrase:string):Promise<string>{
 if(!raw||typeof raw!=='object')throw new Error('Invalid encrypted case.');const v=raw as CaseVault;
 if(v.format!=='veylens-vault/1'||v.kdf!=='PBKDF2-SHA256'||v.iterations!==ITERATIONS)throw new Error('Unsupported encrypted-case format.');
 const salt=bytes(v.salt,16),iv=bytes(v.iv,12),ciphertext=bytes(v.ciphertext,MAX_BYTES+16);
 if(salt.length!==16||iv.length!==12||ciphertext.length<17)throw new Error('Invalid encrypted case.');
 try{const data=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},await key(passphrase,salt,ITERATIONS),ciphertext);const text=new TextDecoder('utf-8',{fatal:true}).decode(data);JSON.parse(text);return text;}catch{throw new Error('Could not unlock this case. Check the passphrase or encrypted file.');}
}
