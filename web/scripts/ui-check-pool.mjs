// Stop assigning work after a failure; wait for running checks before cleanup.
export async function runPool(jobs, workers, run) {
 let next=0,failure;
 await Promise.all(Array.from({length:Math.min(workers,jobs.length)},async(_,worker)=>{
  while(!failure){
   const index=next++;
   if(index>=jobs.length)return;
   try{await run(jobs[index],worker)}catch(error){failure??=error}
  }
 }));
 if(failure)throw failure;
}
