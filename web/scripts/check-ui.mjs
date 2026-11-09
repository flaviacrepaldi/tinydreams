// Every publication check runs against an isolated database and browser.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir,availableParallelism,totalmem} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {runPool} from './ui-check-pool.mjs';
import {uiCheckPlan} from './ui-check-plan.mjs';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
assert.ok(args.length===0||(args.length===1&&args[0]==='--smoke'),'Use check-ui.mjs [--smoke]');
const mode=args.length?'smoke':'full';
const editions=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8')).map(e=>e.id);
const {workers,shards,jobs}=uiCheckPlan({cpus:availableParallelism(),memory:totalmem(),workers:process.env.TINY_QA_WORKERS,editions:editions.length,mode});
const temp=await mkdtemp(join(tmpdir(),'tiny-ui-'));
const children=[],lanes=[];
const began=Date.now();
async function freePort(){const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve)});const port=s.address().port;await new Promise(r=>s.close(r));return port}
function start(command,args,env={}){
 const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let log='';
 child.stdout.on('data',b=>{log=(log+b).slice(-30000)});child.stderr.on('data',b=>{log=(log+b).slice(-30000)});
 const done=new Promise(resolve=>{child.once('error',error=>{log=error.message;resolve()});child.once('exit',resolve)});
 const p={child,done,log:()=>log};children.push(p);return p;
}
async function ready(url,p){const until=Date.now()+30000;while(Date.now()<until){if(p.child.exitCode!=null||p.child.signalCode!=null)throw Error('UI process exited before readiness: '+(p.log()||'exit '+p.child.exitCode));try{if((await fetch(url)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('UI check could not start: '+p.log())}
async function lane(index){
 if(lanes[index])return lanes[index];
 const port=await freePort(),debug=await freePort();
 const qaUrl=`http://127.0.0.1:${port}`,debugUrl=`http://127.0.0.1:${debug}`;
 const server=start(process.execPath,['scripts/dev.mjs'],{PORT:String(port),TINY_DREAMS_DB:'sqlite',TINY_DREAMS_SQLITE_PATH:join(temp,`qa-${index}.sqlite`)});
 const chrome=start(process.env.TINY_QA_CHROME||'google-chrome',['--headless','--no-sandbox','--disable-gpu',`--remote-debugging-port=${debug}`,`--user-data-dir=${join(temp,`chrome-${index}`)}`,'about:blank']);
 await Promise.all([ready(qaUrl+'/version.json',server),ready(debugUrl+'/json/version',chrome)]);
 return lanes[index]={qaUrl,debugUrl};
}
// Separate theme ranges retain every edition/viewport/scenario, with no shared DB or tab.
try{
 console.log(`UI checks (${mode}): ${jobs.length} jobs, ${workers} isolated workers`);
 await runPool(jobs,workers,async(job,index)=>{
  const {qaUrl,debugUrl}=await lane(index),started=Date.now();
  console.log(`START ${job.name}`);
  const p=start(process.execPath,['scripts/'+job.script],{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl,...job.env});
  await p.done;
  console.log(p.log().trim());
  if(p.child.exitCode!==0)throw Error(`${job.name} failed: ${p.log()}`);
  // Each test owns its page; release completed tabs and their timers before reuse.
  const targets=await (await fetch(debugUrl+'/json/list')).json();
  for(const target of targets)if(target.type==='page')await fetch(debugUrl+'/json/close/'+target.id);
  console.log(`PASS ${job.name} · ${((Date.now()-started)/1000).toFixed(1)}s`);
 });
 if(mode==='full'){
 const directory='/tmp/tiny-reward-themes';
 const reports=await Promise.all(Array.from({length:shards},(_,i)=>readFile(`${directory}/report-${i}.json`,'utf8').then(JSON.parse)));
 const checked=reports.flatMap(r=>r.editions);
 assert.deepEqual([...checked].sort(),[...editions].sort(),'Every theme must be checked exactly once');
 const failures=reports.flatMap(r=>r.failures);assert.deepEqual(failures,[]);
 await writeFile(directory+'/report.json',JSON.stringify({editions:checked,widths:[320,390,430,1280],captures:reports.reduce((n,r)=>n+r.captures,0),failures,captureMetadata:Object.assign({},...reports.map(r=>r.captureMetadata))},null,2));
 }
 console.log(`PASS: ${mode} UI publication gate · ${((Date.now()-began)/1000).toFixed(1)}s. Screenshots: /tmp/streak-alignment-*.png`);
}finally{
 const active=children.filter(p=>p.child.exitCode==null&&p.child.signalCode==null);
 for(const p of active)p.child.kill('SIGTERM');
 const timer=setTimeout(()=>{for(const p of active)if(p.child.exitCode==null&&p.child.signalCode==null)p.child.kill('SIGKILL')},2000);
 await Promise.all(children.map(p=>p.done));clearTimeout(timer);
 await rm(temp,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
