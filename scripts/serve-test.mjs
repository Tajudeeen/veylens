// CI-only loopback server for the exact bundled Worker. No runtime credentials.
import {createServer} from 'node:http';
import worker from '../dist/server/index.js';
const host='127.0.0.1',port=4175;
const server=createServer(async(req,res)=>{
 try{
  let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>2_000_000){res.writeHead(413);res.end();return;}parts.push(part);}
  const request=new Request(`http://${host}:${port}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{})});
  const response=await worker.fetch(request,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Test server error');}
});
server.listen(port,host);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
