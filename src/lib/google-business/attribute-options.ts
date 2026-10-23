import {isPaymentLine} from './payment-options';
export type AttributeRow={index:number;key:string;label:string;value:string;group:string;editable:boolean};
const labels:Record<string,string>={
 'Is owned by women':'Women-owned','Is small business':'Small business','Requires appointments':'Appointment required',
 'Has in store pickup':'In-store pickup','Has in store shopping':'In-store shopping','Has delivery':'Delivery','Has onsite services':'On-site services',
 'Sells shoes for women':"Women's shoes",'Sells clothing for women':"Women's clothing",
 'Has wheelchair accessible seating':'Wheelchair-accessible seating','Has wheelchair accessible restroom':'Wheelchair-accessible restroom','Has wheelchair accessible entrance':'Wheelchair-accessible entrance',
 'Has restroom unisex':'Gender-neutral restroom','Welcomes lgbtq':'LGBTQ+ friendly','Is transgender safespace':'Transgender safe space',
 'Has recycling clothing':'Clothing recycling','Has recycling electronics':'Electronics recycling','Has parking garage paid':'Paid parking garage'};
export function attributeRows(text:string):AttributeRow[]{return text.split('\n').flatMap((line,index)=>{if(!line.trim()||isPaymentLine(line))return [];const colon=line.indexOf(':');const key=colon<0?line.trim():line.slice(0,colon).trim(),value=colon<0?'':line.slice(colon+1).trim();
 const group=/^Url |https?:\/\//i.test(line)?'Social links':/wheelchair|accessible/i.test(key)?'Accessibility':/parking/i.test(key)?'Parking':/recycling/i.test(key)?'Recycling':/owned|small business/i.test(key)?'From the business':/appointment/i.test(key)?'Planning':/lgbtq|transgender/i.test(key)?'Crowd':/restroom|wi fi/i.test(key)?'Amenities':/pickup|shopping|delivery|onsite|sells/i.test(key)?'Service options':'Other attributes';
 return [{index,key,label:labels[key]||key.replace(/^(Has|Is|Sells) /,'').replace(/^./,s=>s.toUpperCase()),value,group,editable:colon>=0&&['Yes','No',''].includes(value)&&group!=='Social links'}];});}
/** Edit one line only: preserve unrelated fields, duplicates, payment values and URLs verbatim. */
export function updateAttribute(text:string,index:number,value:'Yes'|'No'|''){const lines=text.split('\n'),line=lines[index];if(line===undefined||isPaymentLine(line)||line.indexOf(':')<0)throw new Error('Unknown attribute');const row=attributeRows(text).find(row=>row.index===index);if(!row?.editable)throw new Error('Unsupported attribute');lines[index]=line.slice(0,line.indexOf(':')+1)+(value?' '+value:'');return lines.join('\n');}
