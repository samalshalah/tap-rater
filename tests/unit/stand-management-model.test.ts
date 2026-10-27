import {it,expect} from 'vitest';
import {indexStandSearch,filterStandSearch} from '@/components/account/stand-management-model';
import {formatOrderReference} from '@/lib/order-reference';
import type {CustomerPortalStand} from '@/lib/customer-portal';
const stand=(id:string,extra:Partial<CustomerPortalStand>={}):CustomerPortalStand=>({id,title:'Google Stand',kind:'standard',orderReference:'cs_test_'+id,...extra} as CustomerPortalStand);
const original=(stands:CustomerPortalStand[],kind:string,search:string)=>stands.filter(s=>(kind==='all'||s.kind===kind)&&`${s.standLabel??''} ${s.assignedBusinessName??''} ${s.standId??''} ${s.title} ${s.businessName??''} ${formatOrderReference(s.orderReference)}`.toLowerCase().includes(search.toLowerCase()));
it('retains all searchable fields, formatting, spacing and case behavior',()=>{
 const stands=[stand('a',{standLabel:'Front Desk',assignedBusinessName:'Cafe',standId:'ST-123',businessName:'Main Branch'}),stand('b',{kind:'multilink',title:'Links'}),stand('c',{kind:'branded'}),stand('d',{kind:'custom'})];
 const index=indexStandSearch(stands);
 for(const kind of ['all','standard','multilink','branded','custom','unknown'])for(const query of ['','FRONT','cafe','st-123','Main Branch','google','Links',' ', 'missing',formatOrderReference(stands[0].orderReference)])expect(filterStandSearch(index,kind,query)).toEqual(original(stands,kind,query));
});
it('preserves row identity, order and duplicates',()=>{
 const a=stand('a'),b=stand('b');const rows=filterStandSearch(indexStandSearch([b,a,a]),'all','');expect(rows).toEqual([b,a,a]);expect(rows[1]).toBe(a);
});
it('supports empty data and missing optional fields',()=>{
 expect(filterStandSearch(indexStandSearch([]),'all','')).toEqual([]);
 expect(filterStandSearch(indexStandSearch([stand('a')]),'standard','google')).toHaveLength(1);
});
it('reads order references only while indexing, not for every search or type change',()=>{
 let reads=0;const stands=Array.from({length:1000},(_,i)=>({...stand(String(i)),get orderReference(){reads++;return 'cs_test_'+i;}}));
 const index=indexStandSearch(stands);expect(reads).toBe(1000);
 for(const query of ['g','go','goo','goog','googl','google'])filterStandSearch(index,'all',query);
 filterStandSearch(index,'custom','');expect(reads).toBe(1000);
});
it('reflects replacement stand data after assignment or label updates',()=>{
 const before=indexStandSearch([stand('a',{standLabel:'Old'})]),after=indexStandSearch([stand('a',{standLabel:'New',assignedBusinessName:'New business'})]);
 expect(filterStandSearch(before,'all','new')).toEqual([]);expect(filterStandSearch(after,'all','new business')).toHaveLength(1);
});
