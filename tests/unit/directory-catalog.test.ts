import {describe,it,expect} from 'vitest';
import {listingDifferences} from '@/lib/directory-catalog';
describe('directory comparison',()=>{
 const location={business_name:'Norah Boutique',address:'50 Main Street',phone:'(202) 555-0100',website_url:'https://example.com/'};
 it('ignores presentation differences without ignoring real mismatches',()=>{
  expect(listingDifferences(location,{listed_name:' norah boutique ',listed_address:'50  MAIN Street',listed_phone:'2025550100',listed_website:'https://example.com'})).toEqual([]);
  expect(listingDifferences(location,{listed_name:'Another business',listed_address:'50 Main Street',listed_phone:'2025550101',listed_website:'https://other.example'})).toEqual(['Name','Phone','Website']);
 });
 it('flags missing recorded details only when a correct profile value exists',()=>{
  expect(listingDifferences({...location,phone:null,website_url:null},{listed_name:'',listed_address:'',listed_phone:''})).toEqual(['Name','Address']);
 });
});
