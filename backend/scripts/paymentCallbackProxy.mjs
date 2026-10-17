// Development-only tunnel target: expose payment callbacks, never the full API.
import http from 'node:http';
const paths=new Set(['POST /api/payments/safepay/webhook','POST /api/payments/jazzcash/return','GET /api/payments/return']);
const server=http.createServer((req,res)=>{
  const url=new URL(req.url||'/','http://127.0.0.1');
  if(!paths.has(`${req.method} ${url.pathname}`)){res.writeHead(404);res.end('Not found');return;}
  if(Number(req.headers['content-length']||0)>131072){res.writeHead(413);res.end();return;}
  const headers={};for(const key of ['content-type','x-sfpy-signature'])if(req.headers[key])headers[key]=req.headers[key];
  const target=http.request({hostname:'127.0.0.1',port:5000,path:url.pathname+url.search,method:req.method,headers},reply=>{
    res.writeHead(reply.statusCode||502,{'Content-Type':reply.headers['content-type']||'text/plain','Cache-Control':'no-store'});reply.pipe(res);
  });
  let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>131072){target.destroy();req.destroy();}});
  target.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Payment backend unavailable');});
  req.pipe(target);
});
server.listen(5010,'127.0.0.1',()=>console.log('Payment callback proxy listening on localhost:5010 (callback routes only).'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
