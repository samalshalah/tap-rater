import {useMemo} from 'react';
import type {GoogleLocationChoice} from '@/lib/google-business/location-discovery';

export function googleLocationAddress(location:GoogleLocationChoice){
 return [...(location.storefrontAddress?.addressLines||[]),location.storefrontAddress?.locality,location.storefrontAddress?.administrativeArea,location.storefrontAddress?.postalCode].filter(Boolean).join(', ')||'Service-area business';
}

type WorkspaceBusiness={business_name:string;address?:string};

const addressWords:Record<string,string>={
 ave:'avenue',blvd:'boulevard',cir:'circle',ct:'court',dr:'drive',hwy:'highway',ln:'lane',pl:'place',pkwy:'parkway',rd:'road',st:'street',ste:'suite',va:'virginia'
};

function normalizedWords(value:string){
 return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).map(word=>addressWords[word]||word).join(' ');
}

function streetAndPostalCode(value:string){
 const number=value.match(/\b\d+\b/)?.[0];
 const postalCode=value.match(/\b\d{5}(?:\s?\d{4})?\b/)?.[0]?.replace(/\s/g,'');
 return number&&postalCode?`${number} ${postalCode}`:'';
}

export function findMatchingGoogleLocation(business:WorkspaceBusiness,locations:GoogleLocationChoice[]){
 const businessName=normalizedWords(business.business_name);
 const businessAddress=normalizedWords(business.address||'');
 if(!businessName||!businessAddress)return undefined;
 const businessStreetAndPostal=streetAndPostalCode(businessAddress);
 const matches=locations.filter(choice=>{
  const locationName=normalizedWords(choice.title||'');
  const locationAddress=normalizedWords(googleLocationAddress(choice));
  if(locationName!==businessName)return false;
  return locationAddress===businessAddress||Boolean(businessStreetAndPostal&&businessStreetAndPostal===streetAndPostalCode(locationAddress));
 });
 return matches.length===1?matches[0]:undefined;
}

export function prioritizeMatchingGoogleLocation(locations:GoogleLocationChoice[],match:GoogleLocationChoice|undefined){
 if(!match)return locations;
 return [match,...locations.filter(choice=>choice.name!==match.name)];
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
