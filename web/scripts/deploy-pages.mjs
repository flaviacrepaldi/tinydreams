import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';

const webRoot=new URL('../',import.meta.url);
const wrangler=fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js',webRoot));
// Run from the workspace root so Pages does not load the local Worker/D1 config.
const cwd=fileURLToPath(new URL('../',webRoot));
const config=JSON.parse(readFileSync(new URL('wrangler.jsonc',webRoot),'utf8'));
function run(args){
  const result=spawnSync(process.execPath,args,{cwd,stdio:'inherit',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID||config.account_id}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
const args=process.argv.slice(2);
if(args.length>0 && !(args.length===1 && args[0]==='--help'))throw Error('Use npm run deploy or npm run deploy -- --help.');
if(args[0]==='--help'){
  run([wrangler,'pages','deploy','--help']);
}else{
  run([fileURLToPath(new URL('scripts/build-pages.mjs',webRoot))]);
  run([fileURLToPath(new URL('scripts/test-pages.mjs',webRoot))]);
  run([wrangler,'pages','deploy',fileURLToPath(new URL('dist-pages/',webRoot)),'--project-name','tinydreams','--branch','main','--commit-dirty=true']);
}
