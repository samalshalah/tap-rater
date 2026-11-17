import type {createGoogleBusinessClient} from './google-business/client';
type Client=Pick<ReturnType<typeof createGoogleBusinessClient>,'listAccounts'|'listLocations'>;
export type PreviewMatch={account:string;location:string;title:string;address:string};
/** Read-only discovery. Never infer identity from a business name or partial scan. */
export async function findPreviewMatches(client:Client,placeId:string):Promise<PreviewMatch[]> {
 const accounts=new Map<string,{name:string;type?:string}>(),matches=new Map<string,PreviewMatch>();
 let calls=0;
 const guard=()=>{if(++calls>200)throw Error('There are too many Google locations to check at once. Please contact support.');};
 async function scanAccounts(parent?:string){
  let token:string|undefined;const seen=new Set<string>();
  do{guard();const page=await client.listAccounts(token,parent);for(const a of page.accounts)if(!accounts.has(a.name))accounts.set(a.name,a);
   token=page.nextPageToken;if(token&&seen.has(token))throw Error('Google repeated a results page. Please retry.');if(token)seen.add(token);
  }while(token);
 }
 await scanAccounts();
 // Map iteration includes newly discovered business groups, with resource deduplication.
 for(const a of accounts.values()){
  if(a.type==='ORGANIZATION'||a.type==='USER_GROUP'){await scanAccounts(a.name);continue;}
  let token:string|undefined;const seen=new Set<string>();
  do{guard();const page=await client.listLocations(a.name,token,true);
   for(const l of page.locations)if(l.metadata?.placeId===placeId&&!matches.has(l.name))matches.set(l.name,{account:a.name,location:l.name,title:l.title||'',address:[...(l.storefrontAddress?.addressLines||[]),l.storefrontAddress?.locality,l.storefrontAddress?.administrativeArea,l.storefrontAddress?.postalCode].filter(Boolean).join(', ')});
   token=page.nextPageToken;if(token&&seen.has(token))throw Error('Google repeated a results page. Please retry.');if(token)seen.add(token);
  }while(token);
 }
 return [...matches.values()];
}
