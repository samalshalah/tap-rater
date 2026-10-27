import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {indexListingStatus,useLocalDashboardData} from '@/components/account/local-dashboard-data';
import {LocalLocationForm} from '@/components/account/local-location-controls';
import {LocalLocationSummary} from '@/components/account/local-location-summary';
import type {Location,Listing,Snapshot} from '@/components/account/local-dashboard-types';

Object.assign(globalThis,{React});
const locations=[{id:'a',customer_id:'one',business_name:'Cafe North',address:null,email:'owner@example.test',review_count:3,draft_count:1,unanswered_count:2,connected:true,synced_at:'2026-10-01T12:00:00Z'}, {id:'b',customer_id:'two',business_name:'South Shop',address:'Main Street',email:'shop@example.test',review_count:5,draft_count:0,unanswered_count:0}] as Location[];
const listings=[{business_id:'a',status:'missing',checked_at:null},{business_id:'a',status:'needs_update',checked_at:'2026-10-01'},{business_id:'b',status:'accurate',checked_at:'2026-10-01'}] as Listing[];
const data={locations,listings,customers:[]} as Snapshot;
function derive(snapshot:Snapshot|null=data,customer='',location='',query=''){
 let result!:ReturnType<typeof useLocalDashboardData>;
 function Probe(){result=useLocalDashboardData(snapshot,customer,location,query);return null;}
 renderToStaticMarkup(React.createElement(Probe));return result;
}
describe('local dashboard scope and listing summaries',()=>{
 it('preserves all locations and leaves the review customer scope unset by default',()=>{const r=derive();expect(r.visible).toEqual(locations);expect(r.businessIds).toBeUndefined();});
 it('restricts customer search and review ids to that customer',()=>{const r=derive(data,'one','','SHOP');expect(r.visible).toEqual([]);expect(r.businessIds).toEqual(['a']);expect(r.accountLocations).toEqual([locations[0]]);});
 it('combines exact location selection with case-insensitive name, address and email searches',()=>{for(const query of ['cAFE','OWNER@'])expect(derive(data,'','a',query).visible).toEqual([locations[0]]);expect(derive(data,'','b','MAIN').visible).toEqual([locations[1]]);expect(derive(data,'','a','MAIN').visible).toEqual([]);});
 it('does not trim search text or select an unknown location',()=>{expect(derive(data,'','',' Cafe').visible).toEqual([]);expect(derive(data,'','unknown').selected).toBeUndefined();expect(derive(data,'','unknown').visible).toEqual([]);});
 it('handles loading and replaces summaries after refreshed data',()=>{expect(derive(null).visible).toEqual([]);expect(derive(null).listingStatus.size).toBe(0);expect(derive({...data,listings:[]}).listingStatus.size).toBe(0);expect(derive({...data,locations:[]}).visible).toEqual([]);});
 it('counts only actionable statuses and tracks checked listings independently',()=>{expect([...indexListingStatus(listings)]).toEqual([['a',{issues:2,checked:true}],['b',{issues:0,checked:true}]]);expect(indexListingStatus([{business_id:'x',status:'pending',checked_at:null}] as Listing[]).get('x')).toEqual({issues:0,checked:false});});
 it('preserves cards, listing attention, connection and review actions',()=>{const html=renderToStaticMarkup(React.createElement(LocalLocationSummary,{tab:'overview',query:'',setQuery:()=>{},visible:locations,data,listingStatus:indexListingStatus(listings),choose:()=>{},openTab:()=>{}}));for(const text of ['Cafe North','2 need attention','No recorded issues','Review drafts','Connect Google','Address not provided'])expect(html).toContain(text);});
 it('preserves add form validation, disabled saving state and license guard',()=>{const props={admin:true,data,customer:'one',adding:true,canAdd:true,busy:true,setAdding:()=>{},addLocation:()=>{}};const html=renderToStaticMarkup(React.createElement(LocalLocationForm,props));for(const text of ['name="customerId"','name="name"','maxLength="200"','type="url"','disabled=""','Saving…'])expect(html).toContain(text);const locked=renderToStaticMarkup(React.createElement(LocalLocationForm,{...props,canAdd:false}));expect(locked).toContain('Manage location licenses');expect(locked).not.toContain('<form');});
});
