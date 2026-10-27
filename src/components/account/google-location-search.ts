import {useMemo} from 'react';
import type {GoogleLocationChoice} from '@/lib/google-business/location-discovery';

export function googleLocationAddress(location:GoogleLocationChoice){
 return [...(location.storefrontAddress?.addressLines||[]),location.storefrontAddress?.locality,location.storefrontAddress?.administrativeArea,location.storefrontAddress?.postalCode].filter(Boolean).join(', ')||'Service-area business';
}

export function indexGoogleLocations(locations:GoogleLocationChoice[]){
 return locations.map(choice=>{
  const address=googleLocationAddress(choice);
  return {choice,address,searchText:`${choice.title||choice.name} ${address}`.toLowerCase()};
 });
}

export function useGoogleLocationSearch(locations:GoogleLocationChoice[],filter:string,location:string){
 const index=useMemo(()=>indexGoogleLocations(locations),[locations]);
 const addresses=useMemo(()=>new Map(index.map(row=>[row.choice,row.address])),[index]);
 const visibleLocations=useMemo(()=>{
  const query=filter.trim().toLowerCase();
  return index.filter(row=>row.searchText.includes(query)).map(row=>row.choice);
 },[index,filter]);
 const selected=useMemo(()=>locations.find(choice=>choice.name===location),[locations,location]);
 return {visibleLocations,selected,address:(choice:GoogleLocationChoice)=>addresses.get(choice)??googleLocationAddress(choice)};
}
