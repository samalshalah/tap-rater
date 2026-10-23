export type GoogleLocationChoice={name:string;account:string;accountLabel:string;title?:string;storefrontAddress?:{addressLines?:string[];locality?:string;administrativeArea?:string;postalCode?:string}};
type Account={name:string;accountName?:string;type?:string};
type Page={accounts?:Account[];locations?:Omit<GoogleLocationChoice,'account'|'accountLabel'>[];nextPageToken?:string};
export async function discoverGoogleLocations(post:(body:Record<string,string>)=>Promise<Page>){
 const queue:Account[]=[],seenAccounts=new Set<string>(),choices=new Map<string,GoogleLocationChoice>();
 async function pages(body:Record<string,string>,accept:(page:Page)=>void){
  let token='';const seen=new Set<string>();
  do{const page=await post({...body,...(token?{pageToken:token}:{})});accept(page);token=page.nextPageToken||'';if(token&&seen.has(token))throw Error('Google repeated a page. Please retry loading businesses.');seen.add(token);}while(token);
 }
 await pages({action:'accounts'},p=>queue.push(...(p.accounts||[])));
 for(let i=0;i<queue.length;i++){
  const account=queue[i];if(seenAccounts.has(account.name))continue;seenAccounts.add(account.name);
  if(account.type==='ORGANIZATION'||account.type==='USER_GROUP'){
   await pages({action:'accounts',parent:account.name},p=>queue.push(...(p.accounts||[])));
  }else{
   await pages({action:'locations',account:account.name},p=>{for(const location of p.locations||[])if(!choices.has(location.name))choices.set(location.name,{...location,account:account.name,accountLabel:account.accountName||account.name});});
  }
 }
 return [...choices.values()].sort((a,b)=>(a.title||a.name).localeCompare(b.title||b.name));
}
