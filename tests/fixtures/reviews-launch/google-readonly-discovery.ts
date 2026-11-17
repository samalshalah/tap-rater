import type {createGoogleBusinessClient} from '../../../src/lib/google-business/client';
import {norahLocation,norahTitle} from './google-readonly-guard';
type Client=Pick<ReturnType<typeof createGoogleBusinessClient>,'listAccounts'|'listLocations'>;
type Account={name:string;accountName?:string;type?:string};
/** Accounts are authorized only after this OAuth identity's Google response returns them.
 * No review read is enabled until the exact selected location ID AND title match. */
export async function discoverQaNorah(client:Client,allowedAccounts:Set<string>){
 const queue:Account[]=[],seenAccounts=new Set<string>();let requests=0;
 const budget=()=>{if(++requests>100)throw Error('Google discovery pagination limit');};
 async function accounts(parent?:string){
  let token:string|undefined;const seenTokens=new Set<string>();
  do{
   budget();const page=await client.listAccounts(token,parent);
   for(const account of page.accounts){
    if(!/^accounts\/[A-Za-z0-9_-]+$/.test(account.name))throw Error('Invalid Google discovery account');
    allowedAccounts.add(account.name);queue.push(account);
   }
   token=page.nextPageToken;if(token&&seenTokens.has(token))throw Error('Google repeated a discovery page');if(token)seenTokens.add(token);
  }while(token);
 }
 await accounts();
 for(let index=0;index<queue.length;index++){
  const account=queue[index];if(seenAccounts.has(account.name))continue;seenAccounts.add(account.name);
  try{
   if(account.type==='ORGANIZATION'||account.type==='USER_GROUP'){await accounts(account.name);continue;}
   let token:string|undefined;const seenTokens=new Set<string>();
   do{
    budget();const page=await client.listLocations(account.name,token);
    const location=page.locations.find(item=>item.name===norahLocation);
    if(location){if(location.title!==norahTitle)throw Error('Selected location identity mismatch');return {account:account.name,location};}
    token=page.nextPageToken;if(token&&seenTokens.has(token))throw Error('Google repeated a discovery page');if(token)seenTokens.add(token);
   }while(token);
  }catch(error){
   // One stale/inaccessible account must not hide the selected business in another.
   if(![403,404].includes(Number((error as {status?:number}).status)))throw error;
  }
 }
 throw Error('Norah Boutique was not found in this Google account. Check owner or manager access.');
}
