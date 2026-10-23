export const weekDays=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const;
export type HoursPeriod={open:string;close:string;nextDay:boolean};
export type DayHours={day:string;status:'unset'|'closed'|'open'|'all_day';periods:HoursPeriod[]};
export type SpecialHours={date:string;endDate:string;status:'closed'|'open'|'all_day';periods:HoursPeriod[]};
const range=/^(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})(?:\s*\(([A-Z]+)\))?$/;
export const blankPeriod=():HoursPeriod=>({open:'',close:'',nextDay:false});
function parsePeriod(value:string,day?:string):HoursPeriod|null{const m=value.match(range);if(!m)return null;const next=day?weekDays[(weekDays.indexOf(day as typeof weekDays[number])+1)%7]:undefined;if(m[3]&&m[3]!==next)return null;return {open:m[1],close:m[2],nextDay:Boolean(m[3])||m[2]<m[1]};}
export function parseWeeklyHours(text:string){const days:DayHours[]=weekDays.map(day=>({day,status:'unset',periods:[]}));const preserved:string[]=[];for(const line of text.split('\n').filter(v=>v.trim())){const m=line.match(/^([A-Z]+):\s*(.+)$/);const day=days.find(d=>d.day===m?.[1]);if(!m||!day){preserved.push(line);continue;}if(m[2]==='Closed'&&day.status==='unset'){day.status='closed';continue;}if(m[2]==='24 hours'&&day.status==='unset'){day.status='all_day';continue;}const p=parsePeriod(m[2],day.day);if(!p||day.status==='closed'||day.status==='all_day'){preserved.push(line);continue;}day.status='open';day.periods.push(p);}return {days,preserved};}
export function serializeWeeklyHours(days:DayHours[],preserved:string[]=[]){return [...days.flatMap(d=>d.status==='unset'?[]:d.status==='closed'?[`${d.day}: Closed`]:d.status==='all_day'?[`${d.day}: 00:00 – 24:00`]:d.periods.map(p=>`${d.day}: ${p.open} – ${p.close}${p.nextDay?' ('+weekDays[(weekDays.indexOf(d.day as typeof weekDays[number])+1)%7]+')':''}`)),...preserved].join('\n');}
function nextDate(date:string){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
export function parseSpecialHours(text:string){const entries:SpecialHours[]=[];const preserved:string[]=[];for(const line of text.split('\n').filter(v=>v.trim())){const m=line.match(/^(\d{4}-\d{2}-\d{2})(?:\s*[–-]\s*(\d{4}-\d{2}-\d{2}))?:\s*(.+)$/);if(!m){preserved.push(line);continue;}if(m[3]==='Closed'){entries.push({date:m[1],endDate:m[2]||m[1],status:'closed',periods:[]});continue;}const p=parsePeriod(m[3]);if(m[2]&&m[2]!==m[1]&&m[2]!==nextDate(m[1])){preserved.push(line);continue;}if(!p){preserved.push(line);continue;}p.nextDay=Boolean(m[2]&&m[2]===nextDate(m[1]))||p.nextDay;const end=p.nextDay?m[1]:m[2]||m[1];const existing=entries.find(e=>e.date===m[1]&&e.endDate===end&&e.status==='open');if(existing)existing.periods.push(p);else entries.push({date:m[1],endDate:end,status:'open',periods:[p]});}return {entries,preserved};}
export function serializeSpecialHours(entries:SpecialHours[],preserved:string[]=[]){return [...entries.flatMap(e=>{const prefix=e.date+(e.endDate&&e.endDate!==e.date?' – '+e.endDate:'');return e.status==='closed'?[prefix+': Closed']:e.status==='all_day'?[prefix+': 00:00 – 24:00']:e.periods.map(p=>`${p.nextDay?e.date+' – '+nextDate(e.date):prefix}: ${p.open} – ${p.close}`);}),...preserved].join('\n');}
const minutes=(s:string)=>s==='24:00'?1440:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):NaN;
function intervals(periods:HoursPeriod[]){return periods.map(p=>({start:minutes(p.open),end:minutes(p.close)+(p.nextDay?1440:0)}));}
function invalidPeriods(periods:HoursPeriod[]){if(!periods.length)return true;const spans=intervals(periods);return spans.some((p,i)=>!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start>=1440||p.end<=p.start||p.end-p.start>1440||spans.some((q,j)=>i!==j&&p.start<q.end&&q.start<p.end));}
function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function hoursError(days:DayHours[],entries:SpecialHours[]){
 for(const d of days)if(d.status==='open'&&invalidPeriods(d.periods))return `${d.day[0]+d.day.slice(1).toLowerCase()}: choose valid, non-overlapping opening and closing times.`;
 const spans=days.flatMap((d,i)=>(d.status==='all_day'?[{start:0,end:1440}]:d.status==='open'?intervals(d.periods):[]).map(p=>({start:p.start+i*1440,end:p.end+i*1440})));
 if(spans.some((p,i)=>spans.some((q,j)=>i!==j&&[0,10080,-10080].some(offset=>p.start<q.end+offset&&q.start+offset<p.end))))return 'Opening periods overlap across two days. Check overnight hours.';
 for(const [i,e] of entries.entries()){
  if(!validDate(e.date)||!validDate(e.endDate)||e.endDate<e.date)return 'Choose a valid date or date range for each special-hours entry.';
  if(e.status==='open'&&invalidPeriods(e.periods))return 'Special hours: choose valid, non-overlapping opening and closing times.';
  if(e.endDate!==e.date&&e.status!=='closed')return 'Use a separate date for each special opening schedule. Date ranges are for closures.';
  if(entries.some((other,j)=>i!==j&&e.date<=other.endDate&&other.date<=e.endDate))return 'Special-hour dates overlap. Add extra opening periods to the same date.';
 }
 return '';
}
