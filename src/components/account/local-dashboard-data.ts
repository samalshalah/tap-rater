import {useMemo} from 'react';
import type {Location,Listing,Snapshot} from './local-dashboard-types';

export type ListingStatus={issues:number;checked:boolean};
const emptyLocations:Location[]=[];
const emptyListings:Listing[]=[];

// One pass per refreshed listing snapshot, rather than a scan for every card.
export function indexListingStatus(listings:Listing[]){
 const index=new Map<string,ListingStatus>();
 for(const listing of listings){
  let status=index.get(listing.business_id);
  if(!status){status={issues:0,checked:false};index.set(listing.business_id,status);}
  if(listing.status==='missing'||listing.status==='needs_update')status.issues++;
  if(listing.checked_at)status.checked=true;
 }
 return index;
}

export function useLocalDashboardData(data:Snapshot|null,customer:string,location:string,query:string){
 const locations=data?.locations??emptyLocations;
 const listings=data?.listings??emptyListings;
 const searchIndex=useMemo(()=>new Map(locations.map(l=>[l,[l.business_name,l.address,l.email].join(' ').toLowerCase()])),[locations]);
 const accountLocations=useMemo(()=>locations.filter(l=>!customer||l.customer_id===customer),[locations,customer]);
 const visible=useMemo(()=>{
  const needle=query.toLowerCase();
  return accountLocations.filter(l=>(!location||l.id===location)&&(!query||searchIndex.get(l)!.includes(needle)));
 },[accountLocations,location,query,searchIndex]);
 const selected=useMemo(()=>locations.find(l=>l.id===location),[locations,location]);
 const listingStatus=useMemo(()=>indexListingStatus(listings),[listings]);
 const businessIds=useMemo(()=>customer?accountLocations.map(l=>l.id):undefined,[customer,accountLocations]);
 return {accountLocations,visible,selected,listingStatus,businessIds};
}
