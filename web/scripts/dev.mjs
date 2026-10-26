import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.js';

const port=Number(process.env.PORT||4173);
const mode=process.env.TINY_DREAMS_DB||'d1';
let db;
if(mode==='sqlite'){
  const {localDB}=await import('./sqlite.mjs');
  db=localDB(fileURLToPath(new URL('../.local/garden.sqlite',import.meta.url)));
}else if(mode==='d1'){
  const {remoteD1}=await import('./d1.mjs');
  const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  const binding=config.d1_databases.find(b=>b.binding==='DB');
  if(!binding?.remote)throw Error('O banco DB precisa estar configurado como remoto.');
  db=remoteD1({accountId:config.account_id,databaseId:binding.database_id});
  // Fail visibly rather than silently storing new habits in a local fallback.
  await db.prepare('SELECT id FROM goals LIMIT 1').all();
}else{
  throw new Error('TINY_DREAMS_DB must be d1 or sqlite.');
}

const editionCatalog=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8'));
const editionPaths=new Set(editionCatalog.map(e=>e.asset).filter(Boolean));
const staticAssets={async fetch(request){
  const path=new URL(request.url).pathname;
  if(!editionPaths.has(path))return new Response('Not found',{status:404});
  try{
    const bytes=await readFile(new URL('../assets'+path,import.meta.url));
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('Edition artwork unavailable',{status:503});}
}};

const server=createServer(async(req,res)=>{
  try{
    const parts=[];
    let size=0;
    for await(const part of req){
      size+=part.length;
      if(size>8192){res.writeHead(413);res.end('Request too large');return;}
      parts.push(part);
    }
    const headers=new Headers(req.headers);
    // This identity is local-only; the loopback server must never be published.
    headers.set('oai-authenticated-user-id','local-preview');
    const request=new Request(`http://localhost:${port}${req.url}`,{
      method:req.method,headers,
      ...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{}),
    });
    const response=await worker.fetch(request,{DB:db,ASSETS:staticAssets});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){
    console.error('Local preview request failed:',error.name);
    res.writeHead(503,{'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({error:'Não foi possível conectar ao banco agora. Tente novamente.'}));
  }
});
server.on('error',async error=>{
  console.error(error.code==='EADDRINUSE'?`A porta ${port} já está em uso. Encerre a prévia anterior ou escolha outra porta.`:error.message);
  process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log(`Tiny Dreams: http://localhost:${port}\nDatabase: ${mode==='d1'?'Cloudflare D1 remoto · tiny-dreams':'SQLite local · modo offline'}\nAcesso local apenas; o site não foi publicado.`));
async function shutdown(){
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
process.once('SIGINT',()=>shutdown().finally(()=>process.exit()));
process.once('SIGTERM',()=>shutdown().finally(()=>process.exit()));
