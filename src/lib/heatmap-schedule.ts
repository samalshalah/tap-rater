/** Weekly campaigns use Monday midnight in the campaign's current New York timezone. */
export function weeklyScanPeriod(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>Number(parts.find(p=>p.type===type)!.value);
 const date=new Date(Date.UTC(part('year'),part('month')-1,part('day')));
 date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 return date.toISOString().slice(0,10);
}
