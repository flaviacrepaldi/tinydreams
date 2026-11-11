import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Intercept subprocesses, so gate ordering is tested without building or uploading.
const temp=await mkdtemp(join(tmpdir(),'tiny-deploy-gate-'));
try{
 const preload=join(temp,'mock.mjs'),log=join(temp,'calls.jsonl');
 await writeFile(preload,`
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {appendFileSync} from 'node:fs';
import {basename} from 'node:path';
const childProcess=createRequire(import.meta.url)('node:child_process');
childProcess.spawnSync=(_command,args)=>{
 appendFileSync(process.env.TINY_GATE_TEST_LOG,JSON.stringify(args)+'\\n');
 return {status:basename(args[0])===process.env.TINY_GATE_TEST_FAIL?17:0};
};
syncBuiltinESMExports();
`);
 for(const fail of ['', 'build-pages.mjs','test-pages.mjs','check-ui.mjs']){
  await writeFile(log,'');
  const result=spawnSync(process.execPath,['--import',preload,fileURLToPath(new URL('deploy-pages.mjs',import.meta.url))],{encoding:'utf8',env:{...process.env,TINY_GATE_TEST_LOG:log,TINY_GATE_TEST_FAIL:fail}});
  assert.equal(result.status,fail?17:0,result.stderr);
  const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
  const names=calls.map(args=>args[0].split('/').at(-1));
  const stages=['build-pages.mjs','test-pages.mjs','check-ui.mjs','wrangler.js'];
  assert.deepEqual(names,fail?stages.slice(0,stages.indexOf(fail)+1):stages);
  assert.ok(!names.includes('migrate-remote.mjs'),'Pages deploy must not require D1 API permissions');
  if(names.includes('check-ui.mjs'))assert.deepEqual(calls[2].slice(1),['--smoke']);
  if(fail)assert.ok(!names.includes('wrangler.js'),'A failed check must stop before upload');
 }
 await writeFile(log,'');
 const help=spawnSync(process.execPath,['--import',preload,fileURLToPath(new URL('deploy-pages.mjs',import.meta.url)),'--help'],{encoding:'utf8',env:{...process.env,TINY_GATE_TEST_LOG:log,TINY_GATE_TEST_FAIL:''}});
 assert.equal(help.status,0,help.stderr);
 const helpCalls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
 assert.equal(helpCalls.length,1,'Help must not migrate or deploy');
 assert.deepEqual(helpCalls[0].slice(1),['pages','deploy','--help']);
 console.log('PASS: local/CI deployment runs the quick gate and every failed validation prevents Cloudflare upload.');
}finally{await rm(temp,{recursive:true,force:true})}
