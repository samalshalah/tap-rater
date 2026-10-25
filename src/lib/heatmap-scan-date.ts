type DatedScan={submitted_at?:string|null;created_at?:string|null};
export function formatHeatmapScanDate(scan:DatedScan,includeTime=false){
 const value=scan.submitted_at||scan.created_at;
 if(!value)return 'Date unavailable';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'Date unavailable';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const part=(name:string)=>parts.find(p=>p.type===name)!.value;
 const day=part('year')+'-'+part('month')+'-'+part('day');
 return includeTime?day+' · '+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date):day;
}
