import {z} from 'zod';

const coordinates=z.object({latitude:z.number().finite().min(-80).max(80),longitude:z.number().finite().min(-180).max(180)});
type ProfilePin={title:string;placeId?:string;latitude?:number;longitude?:number};

/** Exact-ID lookup only: never guess a business from its name or address. */
export async function lookupPlaceCoordinates(placeId:string,request:typeof fetch=fetch,env:Record<string,string|undefined>=process.env){
 const key=env.GOOGLE_PLACES_API_KEY||env.GOOGLE_MAPS_API_KEY||env.GOOGLE_MAPS_PLATFORM_API_KEY||env.MAPS_PLATFORM_API_KEY;
 if(!key||!placeId)return null;
 const url=new URL('https://maps.googleapis.com/maps/api/place/details/json');
 url.searchParams.set('place_id',placeId);
 url.searchParams.set('fields','place_id,geometry/location');
 url.searchParams.set('key',key);
 try{
  const response=await request(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)return null;
  const body=await response.json();
  if(body.status!=='OK'||body.result?.place_id!==placeId)return null;
  const pin=coordinates.safeParse({latitude:body.result?.geometry?.location?.lat,longitude:body.result?.geometry?.location?.lng});
  return pin.success?pin.data:null;
 }catch{return null;} // Do not expose provider responses or credential-bearing URLs.
}

export async function resolveHeatmapAnchor(google:ProfilePin,center?:z.infer<typeof coordinates>,lookup=lookupPlaceCoordinates){
 if(!google.placeId)return null;
 const pin=coordinates.safeParse(google);
 if(pin.success)return {...google,...pin.data,centerSource:'google_api' as const};
 // An explicit, validated manual choice should not incur an unnecessary lookup.
 if(center){const selected=coordinates.safeParse(center);if(selected.success)return {...google,...selected.data,centerSource:'selected' as const};return null;}
 const found=await lookup(google.placeId);
 return found?{...google,...found,centerSource:'google_places' as const}:null;
}
