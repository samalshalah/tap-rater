/** Sequential page requests keep provider and database rate limits bounded. */
export async function importReviewPages(
 page:()=>Promise<{imported:number;more:boolean}>,
 progress:(count:number)=>void,
 wait:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,11000)),
 cancelled:()=>boolean=()=>false,
){
 let imported=0;
 for(let n=0;n<10000;n++){
  if(cancelled())return;
  let result:{imported:number;more:boolean};
  for(let attempt=0;;attempt++){
   try{result=await page();break;}catch(error){
    const status=(error as {status?:number}).status;
    if(attempt>=2||![409,429,503].includes(status||0))throw error;
    await wait();if(cancelled())return;
   }
  }
  imported+=result.imported;progress(imported);
  if(!result.more)return;
  await wait();
 }
 throw new Error('Import paused after 10,000 pages. Resume to continue.');
}
