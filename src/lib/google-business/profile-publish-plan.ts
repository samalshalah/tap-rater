import type {ProfileFields} from './profile-data';
import {parseWeeklyHours,parseSpecialHours,hoursError,weekDays} from './hours';

const lines=(s='')=>s.split('\n').map(v=>v.trim()).filter(Boolean);
const time=(s:string)=>({hours:Number(s.slice(0,2)),minutes:Number(s.slice(3))});
const date=(s:string)=>{const [year,month,day]=s.split('-').map(Number);return {year,month,day};};
const tomorrow=(s:string)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
export function profilePublishPlan(observed:ProfileFields,draft:ProfileFields){
 const body:Record<string,unknown>={},labels:string[]=[],remaining:string[]=[],accepted={...observed,details:{...observed.details}};
 const d=draft.details||{},o=observed.details||{};
 const add=(field:string,value:unknown,label:string)=>{body[field]=value;labels.push(label);};
 for(const [key,field,label] of [['name','title','Business name'],['website','websiteUri','Website'],['description','profile','Description']] as const){if(draft[key]!==observed[key]){add(field,key==='description'?{description:draft[key]}:draft[key],label);accepted[key]=draft[key];}}
 if(draft.phone!==observed.phone||d.additionalPhones!==o.additionalPhones){add('phoneNumbers',{primaryPhone:draft.phone,additionalPhones:lines(d.additionalPhones)},'Phone numbers');accepted.phone=draft.phone;accepted.details.additionalPhones=d.additionalPhones;}
 if(draft.categories!==observed.categories||JSON.stringify(d.categoryIds)!==JSON.stringify(o.categoryIds)){
  const ids=d.categoryIds||[];if(!ids.length||ids.length>10||ids.length!==lines(draft.categories).length||new Set(ids).size!==ids.length||ids.some(id=>!/^categories\/[A-Za-z0-9_:-]+$/.test(id)))throw new Error('Choose one primary category and up to nine additional categories from the category picker.');
  add('categories',{primaryCategory:{name:ids[0]},additionalCategories:ids.slice(1).map(name=>({name}))},'Categories');accepted.categories=draft.categories;accepted.details.categoryIds=ids;
 }
 const addressKeys=['street','city','region','postalCode','country'] as const;
 if(draft.address!==observed.address||addressKeys.some(k=>d[k]!==o[k])){
  if(!d.street?.trim()||!/^[A-Z]{2}$/.test(d.country||''))throw new Error('Complete the street address and two-letter country code before publishing the address.');
  add('storefrontAddress',{addressLines:lines(d.street),locality:d.city||'',administrativeArea:d.region||'',postalCode:d.postalCode||'',regionCode:d.country},'Address');accepted.address=draft.address;for(const k of addressKeys)accepted.details[k]=d[k];
 }
 if(draft.hours!==observed.hours||draft.specialHours!==observed.specialHours){
  const weekly=parseWeeklyHours(draft.hours),special=parseSpecialHours(draft.specialHours),error=hoursError(weekly.days,special.entries);
  if(error||weekly.preserved.length||special.preserved.length)throw new Error(error||'Review the opening hours before publishing. Some entries could not be read.');
  if(draft.hours!==observed.hours){add('regularHours',{periods:weekly.days.flatMap((v,i)=>v.status==='open'?v.periods.map(p=>({openDay:v.day,openTime:time(p.open),closeDay:p.nextDay?weekDays[(i+1)%7]:v.day,closeTime:time(p.close)})):v.status==='all_day'?[{openDay:v.day,openTime:time('00:00'),closeDay:v.day,closeTime:time('24:00')}]:[])},'Business hours');accepted.hours=draft.hours;}
  if(draft.specialHours!==observed.specialHours){add('specialHours',{specialHourPeriods:special.entries.flatMap<Record<string,unknown>>(v=>v.status==='closed'?[{startDate:date(v.date),endDate:date(v.endDate),closed:true}]:v.periods.map(p=>({startDate:date(v.date),endDate:date(p.nextDay?tomorrow(v.date):v.endDate),openTime:time(p.open),closeTime:time(p.close)})))},'Special hours');accepted.specialHours=draft.specialHours;}
 }
 if(d.openStatus!==o.openStatus&&d.openStatus&&d.openStatus!=='unknown'){add('openInfo.status',d.openStatus,'Business status');accepted.details.openStatus=d.openStatus;}
 const supported=new Set(['categoryIds','additionalPhones',...addressKeys,'openStatus']);
 const ignored=new Set(['media','mediaStatus','attributesStatus']);
 const names:Record<string,string>={paymentMethods:'Payment methods',attributes:'Business attributes',socialLinks:'Social links',moreHours:'Additional hours',serviceAreas:'Service areas',services:'Services',logo:'Logo',cover:'Cover photo',brand:'Brand',featuredMessage:'Featured message',featuredUrl:'Featured URL',latitude:'Map latitude',longitude:'Map longitude',addressVisibility:'Address visibility'};
 for(const key of Object.keys(d) as (keyof typeof d)[])if(!supported.has(key)&&!ignored.has(key)&&JSON.stringify(d[key])!==JSON.stringify(o[key]))remaining.push(names[key]||key);
 const updateMask=Object.keys(body);
 if('openInfo.status' in body){body.openInfo={status:body['openInfo.status']};delete body['openInfo.status'];}
 return {body,updateMask,labels,remaining,accepted};
}
/** Compare only the submitted fields; Google can add output-only fields and omit empty values. */
export function containsSubmitted(actual:unknown,expected:unknown):boolean {
 if(expected===null||expected===undefined||expected==='')return actual===expected||actual===undefined||actual===null;
 if(Array.isArray(expected))return expected.length===0?(actual===undefined||Array.isArray(actual)&&actual.length===0):Array.isArray(actual)&&actual.length===expected.length&&expected.every((v,i)=>containsSubmitted(actual[i],v));
 if(typeof expected==='object')return Object.entries(expected).every(([k,v])=>containsSubmitted((actual as Record<string,unknown>|undefined)?.[k],v));
 return actual===expected||(expected===0&&actual===undefined);
}
