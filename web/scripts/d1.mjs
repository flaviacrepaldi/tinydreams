// Node-only D1 HTTP adapter. Credentials never enter the browser or Worker bundle.
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile);
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
let renewal;
async function refreshLogin(){
  renewal??=exec(process.execPath,[wrangler,'whoami'],{cwd:fileURLToPath(new URL('../',import.meta.url)),timeout:60000,maxBuffer:65536}).catch(()=>{throw Error('A sessão da Cloudflare expirou. Execute npm exec wrangler login na pasta web.');}).finally(()=>{renewal=undefined});
  await renewal;
}
async function login(){
  if(process.env.CLOUDFLARE_API_TOKEN)return {token:process.env.CLOUDFLARE_API_TOKEN};
  const config=process.env.WRANGLER_AUTH_CONFIG||join(process.env.XDG_CONFIG_HOME||join(homedir(),'.config'),'.wrangler','config','default.toml');
  let source;
  try{source=await readFile(config,'utf8');}catch{throw Error('Entre na Cloudflare com npm exec wrangler login na pasta web.');}
  const token=source.match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];
  const expires=source.match(/^expiration_time\s*=\s*"([^"\r\n]+)"/m)?.[1];
  return {token,expires};
}
async function token(){
  let auth=await login();
  if(!auth.token||auth.expires&&Date.parse(auth.expires)<Date.now()+120000){
    await refreshLogin();auth=await login();
  }
  if(!auth.token)throw Error('Sessão da Cloudflare indisponível. Execute npm exec wrangler login na pasta web.');
  return auth.token;
}
export function remoteD1({accountId,databaseId,fetcher=fetch,getToken=token}){
  if(!/^[a-f0-9]{32}$/.test(accountId)||!/^[a-f0-9-]{36}$/.test(databaseId))throw Error('Configuração do D1 inválida.');
  const endpoint=`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  async function query(statements){
    // The D1 query API executes a supplied list as a transactional batch.
    const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${await getToken()}`,'Content-Type':'application/json'},body:JSON.stringify({batch:statements.map(({sql,params})=>({sql,params}))}),signal:AbortSignal.timeout(20000),redirect:'error'});
    let data;
    try{data=await response.json();}catch{throw Error('O D1 respondeu de forma inesperada. Tente novamente.');}
    if(!response.ok||data.success===false||!Array.isArray(data.result)||data.result.some(r=>r.success===false)){
      throw Error(response.status===401||response.status===403?'A sessão da Cloudflare não permite acessar o D1. Execute npm exec wrangler login na pasta web.':'Não foi possível executar a operação no D1. Tente novamente.');
    }
    return data.result;
  }
  return {
    prepare(sql){return {sql,params:[],bind(...params){return {...this,params};},async all(){return (await query([this]))[0];},async run(){return (await query([this]))[0];}};},
    async batch(statements){return query(statements);},
  };
}
