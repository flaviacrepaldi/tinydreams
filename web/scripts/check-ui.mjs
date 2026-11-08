// Run against an isolated database and browser; fail deployment on a layout regression.
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const temp=await mkdtemp(join(tmpdir(),'tiny-ui-'));
const children=[];
async function freePort(){const s=createServer();await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve)});const port=s.address().port;await new Promise(r=>s.close(r));return port}
function start(command,args,env={}){const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>{log=(log+b).slice(-10000)});child.stderr.on('data',b=>{log=(log+b).slice(-10000)});child.on('error',error=>{log=error.message});children.push(child);return {child,log:()=>log}}
async function ready(url,process){const until=Date.now()+30000;while(Date.now()<until){if(process.child.exitCode!=null)throw Error(process.log());try{if((await fetch(url)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('UI check could not start: '+process.log())}
async function run(script,env){const p=start(process.execPath,[script],env);await new Promise((resolve,reject)=>{p.child.once('error',reject);p.child.once('exit',code=>code===0?resolve():reject(Error(p.log())))});console.log(p.log().trim())}
try{
 const port=await freePort(),debug=await freePort();
 const qaUrl=`http://127.0.0.1:${port}`,debugUrl=`http://127.0.0.1:${debug}`;
 const server=start(process.execPath,['scripts/dev.mjs'],{PORT:String(port),TINY_DREAMS_DB:'sqlite',TINY_DREAMS_SQLITE_PATH:join(temp,'qa.sqlite')});
 const chrome=start(process.env.TINY_QA_CHROME||'google-chrome',['--headless','--no-sandbox','--disable-gpu',`--remote-debugging-port=${debug}`,`--user-data-dir=${join(temp,'chrome')}`,'about:blank']);
 await Promise.all([ready(qaUrl+'/version.json',server),ready(debugUrl+'/json/version',chrome)]);
 await run('scripts/check-analytics-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-streak-alignment-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-edit-dialog-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-chapters-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-measure-celebration-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-streak-finish-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-practice-milestones-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-rewards-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-reward-themes-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 await run('scripts/check-keepsakes-browser.mjs',{TINY_QA_URL:qaUrl,TINY_QA_DEBUG_URL:debugUrl});
 console.log('PASS: UI publication gate. Screenshots: /tmp/streak-alignment-*.png');
}finally{
 for(const child of children)if(child.exitCode==null)child.kill('SIGTERM');
 await Promise.all(children.map(child=>child.exitCode!=null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve()},2000).unref()})));
 await rm(temp,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
