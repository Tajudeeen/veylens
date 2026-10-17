/** Read untrusted upstream/request bytes within a fixed memory budget. */
export async function boundedBytes(response:Response,max=2_000_000):Promise<Uint8Array> {
  if(!response.ok)throw new Error('Source unavailable or identifier not found.');
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty source response.');
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max)throw new Error('Source response exceeds supported size.');chunks.push(part.value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;
}
export async function boundedJson(response:Response,max=2_000_000):Promise<unknown>{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(response,max)));}
