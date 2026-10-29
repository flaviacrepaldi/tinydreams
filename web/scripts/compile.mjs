import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseHTML,releaseCSS} from './release.mjs';
const root=new URL('../',import.meta.url);
const files=[['/potion-celebration-v1.png','assets/potion-celebration-v1.png','image/png'],['/','ui/index.html','text/html; charset=utf-8'],['/style.css','ui/style.css','text/css; charset=utf-8'],['/app.js','ui/app.js','text/javascript; charset=utf-8'],['/magic.js','ui/magic.js','text/javascript; charset=utf-8'],['/editions.css','ui/editions.css','text/css; charset=utf-8'],['/garden.png','assets/garden.png','image/png'],['/talismans.png','assets/talismans.png','image/png'],['/ghost-jar-v2.png','assets/ghost-jar-v2.png','image/png'],['/ghost-spirit-v2.png','assets/ghost-spirit-v2.png','image/png'],['/fraunces.ttf','assets/fraunces.ttf','font/ttf'],['/dm-sans.ttf','assets/dm-sans.ttf','font/ttf']];
files.push(['/navigation.css','ui/navigation.css','text/css; charset=utf-8'],['/apple-touch-icon.png','assets/apple-touch-icon.png','image/png'],['/icon-192.png','assets/icon-192.png','image/png'],['/icon-512.png','assets/icon-512.png','image/png'],['/icon.svg','assets/icon.svg','image/svg+xml']);
const assets={};for(const [route,file,type]of files){try{const bytes=await readFile(new URL(file,root));assets[route]={type,data:bytes.toString('base64')}}catch(e){if(route!=='/talismans.png')throw e}}
for(const name of ['garden-wind-base-v1.png','garden-leaves-v1.png'])assets['/'+name]={type:'image/png',data:(await readFile(new URL('assets/'+name,root))).toString('base64')};
const editions=JSON.parse(await readFile(new URL('ui/editions.json',root),'utf8'));
const clock=(await readFile(new URL('ui/theme-clock.mjs',root),'utf8')).replaceAll('export ','');
const brand=(await readFile(new URL('shared/brand.js',root),'utf8')).replaceAll('export ','');
const themes=await readFile(new URL('ui/themes.js',root),'utf8');
assets['/themes.js']={type:'text/javascript; charset=utf-8',data:Buffer.from(`(()=>{'use strict';const editions=${JSON.stringify(editions)};${clock}\n${brand}\n${themes}\n})();`).toString('base64')};
assets['/manifest.webmanifest']={type:'application/manifest+json',data:Buffer.from(JSON.stringify({name:'tiny dreams',short_name:'tiny dreams',start_url:'/',display:'standalone',background_color:'#211b31',theme_color:'#211b31',id:'/',scope:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]})).toString('base64')};
const planner=(await readFile(new URL('shared/planner.js',root),'utf8')).replaceAll('export ','');
const calendar=(await readFile(new URL('shared/calendar.js',root),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
assets['/planner.js']={type:'text/javascript; charset=utf-8',data:Buffer.from(planner+'\n'+calendar).toString('base64')};
assets['/navigation.js']={type:'text/javascript; charset=utf-8',data:(await readFile(new URL('ui/navigation.js',root))).toString('base64')};
assets['/updates.js']={type:'text/javascript; charset=utf-8',data:(await readFile(new URL('ui/updates.js',root))).toString('base64')};
const writers=(await readFile(new URL('shared/writers.js',root),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
const api=(await readFile(new URL('worker/api.js',root),'utf8')).replace(/^import .*;\n/gm,'').replace('export async function api','async function api');
// Stable content fingerprint: rebuilding unchanged source must not reload clients.
const releaseHash=createHash('sha256').update(JSON.stringify(assets)).update(planner).update(writers).update(api);
for(const path of ['pages/auth.js','pages/entry.js','pages/login.html','scripts/compile.mjs','scripts/build-pages.mjs','scripts/release.mjs'])releaseHash.update(path).update(await readFile(new URL(path,root)));
for(const directory of ['editions','writers','celebrations']){
  for(const name of (await readdir(new URL('assets/'+directory+'/',root))).filter(name=>name.endsWith('.png')).sort())releaseHash.update(directory+'/'+name).update(await readFile(new URL('assets/'+directory+'/'+name,root)));
}
const releaseVersion=releaseHash.digest('hex').slice(0,20);
assets['/version.json']={type:'application/json',data:Buffer.from(JSON.stringify({version:releaseVersion})).toString('base64')};
assets['/'].data=Buffer.from(releaseHTML(Buffer.from(assets['/'].data,'base64').toString('utf8'),releaseVersion)).toString('base64');
for(const asset of Object.values(assets))if(asset.type.startsWith('text/css'))asset.data=Buffer.from(releaseCSS(Buffer.from(asset.data,'base64').toString('utf8'),releaseVersion)).toString('base64');
const manifest=JSON.parse(Buffer.from(assets['/manifest.webmanifest'].data,'base64').toString('utf8'));
manifest.icons=manifest.icons.map(icon=>({...icon,src:icon.src+'?v='+releaseVersion}));
assets['/manifest.webmanifest'].data=Buffer.from(JSON.stringify(manifest)).toString('base64');
await writeFile(new URL('worker/index.js',root),`${planner}\n${writers}\n${api}\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){const url=new URL(request.url);try{if(url.pathname.startsWith('/api/'))return await api(request,env);if((url.pathname.startsWith('/editions/')||url.pathname.startsWith('/celebrations/'))&&['GET','HEAD'].includes(request.method)){return env.ASSETS?env.ASSETS.fetch(request):new Response('Edition artwork requires the static assets binding',{status:503})}if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});const headers={'Content-Type':asset.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'"};return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers})}catch(e){console.error('Tiny Dreams request failed',e.name);return new Response(JSON.stringify({error:'Não foi possível salvar agora. Tente novamente.'}),{status:500,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}}};\n`);
console.log('Compiled worker and embedded assets.');
