export function licenceExpiryAfterDays(days:number,now=new Date()):string {
 if(![7,30,90].includes(days))throw Error('Invalid licence duration');
 return new Date(now.getTime()+days*86400000).toISOString();
}
export function licenceCustomExpiry(date:string):string {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose an expiry date');
 const [year,month,day]=date.split('-').map(Number),end=new Date(year,month-1,day,23,59,59,999);
 if(end.getFullYear()!==year||end.getMonth()!==month-1||end.getDate()!==day)throw Error('Invalid expiry date');
 return end.toISOString();
}
export function licenceLocalDate(expiry:string|null):string {
 if(!expiry)return '';
 const date=new Date(expiry);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
