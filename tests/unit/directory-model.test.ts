import {expect,it} from 'vitest';
import {buildDirectoryRows,filterDirectoryRows,summarizeDirectoryRows,empty,type DirectoryLocation,type DirectoryRecord} from '@/components/account/directory-model';
import {missingDirectories} from '@/lib/directory-catalog';
const location=(id:string):DirectoryLocation=>({id,business_name:'Shop '+id,address:'Main Street',phone:null,website_url:null,local_profile_version:1,local_category:'',local_description:'',local_hours:''});
const record=(id:string,business_id:string,directory:string,extra:Partial<DirectoryRecord>={}):DirectoryRecord=>({...empty,id,business_id,directory,...extra});
function legacy(locations:DirectoryLocation[],records:DirectoryRecord[]){return locations.flatMap(l=>{const saved=records.filter(d=>d.business_id===l.id);return [...saved,...missingDirectories(saved.map(d=>d.directory)).map(directory=>({...empty,id:l.id+':'+directory.id,business_id:l.id,directory:directory.name}))].map(d=>({...d,location:l}));});}
it('preserves saved order, duplicates, aliases, custom entries and missing checklist defaults',()=>{
 const locations=[location('b'),location('a'),location('a')],records=[record('1','a','Apple'),record('2','b','Custom'),record('3','a','Apple'),record('4','other','Yelp')];
 expect(buildDirectoryRows(locations,records)).toEqual(legacy(locations,records));
 expect(records).toHaveLength(4);
});
it('does not expose records from unselected locations',()=>{
 expect(buildDirectoryRows([], [record('private','other','Yelp')])).toEqual([]);
 expect(buildDirectoryRows([location('a')],[record('private','other','Yelp')]).some(r=>r.id==='private')).toBe(false);
});
it('indexes saved records linearly across many locations',()=>{
 let reads=0;const records=Array.from({length:200},(_,i)=>({...record(String(i),String(i),'Yelp'),get business_id(){reads++;return String(i);}}));
 buildDirectoryRows(Array.from({length:200},(_,i)=>location(String(i))),records);
 // Two index accesses and one property copy per record, rather than a full scan for every location.
 expect(reads).toBe(600);
});
it('keeps checked counts and statuses including custom statuses',()=>{
 const rows=buildDirectoryRows([location('a')],[record('1','a','Yelp',{status:'listed',checked_at:'2026-10-01'}),record('2','a','Custom',{status:'custom'})]);
 const result=summarizeDirectoryRows(rows);
 expect(result.checked).toBe(1);expect(result.counts.listed).toBe(1);expect(result.counts.custom).toBe(1);
 expect(Object.values(result.counts).reduce((a,b)=>a+b,0)).toBe(rows.length);
});
it.each(['listings','corrections','duplicates'])('preserves search and filter behavior in %s',tab=>{
 const rows=buildDirectoryRows([location('a'),location('b')],[record('1','a','Yelp',{notes:'Correction',status:'needs_update'}),record('2','b','Custom',{status:'missing'})]);
 for(const filter of ['','issues','listed','missing','not_checked','unavailable','needs_update'])for(const query of ['','YELP','shop b','main',' ','no match']){
  const expected=rows.filter(d=>(tab!=='corrections'||Boolean(d.notes))&&(!filter||(filter==='issues'?['missing','needs_update'].includes(d.status):d.status===filter))&&(!query||[d.directory,d.location.business_name,d.location.address].join(' ').toLowerCase().includes(query.toLowerCase())));
  expect(filterDirectoryRows(rows,tab,filter,query)).toEqual(expected);
 }
});
it('reflects replacement data after saving a correction or changing profile',()=>{
 const before=buildDirectoryRows([location('a')],[record('1','a','Yelp')]);
 const after=buildDirectoryRows([{...location('a'),local_profile_version:2}],[record('1','a','Yelp',{notes:'Updated',version:2})]);
 expect(filterDirectoryRows(before,'corrections','','')).toHaveLength(0);
 expect(filterDirectoryRows(after,'corrections','','')[0]).toMatchObject({notes:'Updated',version:2,location:{local_profile_version:2}});
});
