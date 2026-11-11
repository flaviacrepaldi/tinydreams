// Leave CPU and memory headroom for Chrome renderers, the app and the OS.
export function uiCheckPlan({cpus,memory,workers:override,editions,mode='full'}){
 const workers=Number(override??Math.max(1,Math.min(6,Math.floor(cpus/2),Math.floor(memory/(2*1024**3)))));
 if(!Number.isInteger(workers)||workers<1||workers>6)throw Error('TINY_QA_WORKERS must be an integer from 1 to 6');
 if(!['full','smoke'].includes(mode))throw Error('Invalid UI check mode');
 if(mode==='smoke')return {workers:Math.min(workers,3),shards:0,jobs:['streak-alignment','analytics','edit-dialog','group-order'].map(name=>({name,script:`check-${name}-browser.mjs`}))};
 const shards=Math.min(editions,workers);
 const themes=Array.from({length:shards},(_,shard)=>({name:`reward-themes ${shard+1}/${shards}`,script:'check-reward-themes-browser.mjs',env:{TINY_QA_THEME_SHARD:String(shard),TINY_QA_THEME_SHARDS:String(shards)}}));
 // Start the long animation check alongside the matrix instead of after it.
 const jobs=[{name:'rewards',script:'check-rewards-browser.mjs'},...themes];
 for(const name of ['group-order','completed-card','streak-alignment','keepsakes','brand-alignment','skipped-days','practice-milestones','streak-finish','analytics','edit-dialog','chapters','measure-celebration'])jobs.push({name,script:`check-${name}-browser.mjs`});
 return {workers,shards,jobs};
}

export function themeShard(editions,index,count=3){
 if(index===undefined)return editions;
 const shard=Number(index),shards=Number(count);
 if(!Number.isInteger(shards)||shards<1||shards>editions.length||!/^\d+$/.test(String(index))||shard>=shards)throw Error('Invalid theme shard');
 return editions.filter((_,i)=>Math.floor(i*shards/editions.length)===shard);
}
