import {missingDirectories} from '@/lib/directory-catalog';
export type DirectoryLocation={id:string;business_name:string;address:string|null;phone:string|null;website_url:string|null;local_profile_version:number;local_category:string;local_description:string;local_hours:string;connected?:boolean};
export type DirectoryRecord={id:string;business_id:string;directory:string;status:string;listing_url:string;listed_name:string;listed_address:string;listed_phone:string;listed_website:string;notes:string;version:number;checked_at:string|null;correction_state:string;approved_profile_version:number|null};
export const labels:Record<string,string>={not_checked:'Not checked',listed:'Listed',needs_update:'Needs update',missing:'Missing',unavailable:'Unavailable'};
export const field='mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm';
export const empty={directory:'',status:'not_checked',listing_url:'',listed_name:'',listed_address:'',listed_phone:'',listed_website:'',notes:'',version:0,checked_at:null as string|null,correction_state:'draft',approved_profile_version:null as number|null};
export type Edit=typeof empty&{business_id:string};

export type DirectoryRow=DirectoryRecord&{location:DirectoryLocation};
export function buildDirectoryRows(locations:DirectoryLocation[],records:DirectoryRecord[]):DirectoryRow[]{
 const byLocation=new Map<string,DirectoryRecord[]>();
 for(const record of records){const group=byLocation.get(record.business_id);if(group)group.push(record);else byLocation.set(record.business_id,[record]);}
 return locations.flatMap(location=>{const saved=byLocation.get(location.id)||[];return [...saved,...missingDirectories(saved.map(d=>d.directory)).map(directory=>({...empty,id:location.id+':'+directory.id,business_id:location.id,directory:directory.name}))].map(record=>({...record,location}));});
}
export function filterDirectoryRows(rows:DirectoryRow[],tab:string,filter:string,query:string){
 const search=query.toLowerCase();
 return rows.filter(d=>(tab!=='corrections'||Boolean(d.notes))&&(!filter||(filter==='issues'?['missing','needs_update'].includes(d.status):d.status===filter))&&(!query||[d.directory,d.location.business_name,d.location.address].join(' ').toLowerCase().includes(search)));
}
export function summarizeDirectoryRows(rows:DirectoryRow[]){
 const counts:Record<string,number>={};let checked=0;
 for(const row of rows){counts[row.status]=(counts[row.status]||0)+1;if(row.checked_at)checked++;}
 return {counts,checked};
}
