import type {GridSettings} from './heatmap-data';
import {sameGrid} from './heatmap-results';
export type Finding={code:string;kind:'heatmap'|'profile'|'system';title:string;evidence:string;improvement:string;aiEligible:boolean;source:string};
type Scan={methodology?:string;created_at:string;tracks:{id:string;settings:GridSettings}[];points:{trackId:string;state:string;rank:number|null}[]};
export function detectLocalIssues(profile:{observed:Record<string,string>;draft:unknown;synced_at:string}|null,tracks:({id:string;active:boolean}&GridSettings)[],scans:Scan[],now=new Date()):Finding[]{
 const findings:Finding[]=[];
 if(!profile)findings.push({code:'profile-import',kind:'system',title:'Google profile details need to be imported',evidence:'No saved Google profile snapshot is available.',improvement:'Open Google profile and refresh its details before assessing completeness.',aiEligible:false,source:'Tap Rater connection data'});
 else {
  const missing=['description','phone','website','hours','categories'].filter(k=>!profile.observed[k]?.trim());
  if(missing.length)findings.push({code:'profile-missing',kind:'profile',title:'Confirm missing profile information',evidence:`The saved Google snapshot has no ${missing.join(', ')}. Snapshot: ${new Date(profile.synced_at).toISOString().slice(0,10)}.`,improvement:'Confirm the missing facts before preparing changes. An AI draft cannot verify business hours or contact details.',aiEligible:true,source:'Saved Google Business Profile snapshot'});
  const description=profile.observed.description||'';
  const sentences=description.split(/[.!?]+/).map(s=>s.trim().toLowerCase()).filter(s=>s.length>20);
  const repeated=sentences.length>new Set(sentences).size;
  if(description.length>750||repeated)findings.push({code:'profile-description',kind:'profile',title:'Review the business description',evidence:description.length>750?'The saved description exceeds 750 characters.':'The saved description contains a repeated sentence. This is an editorial suggestion, not a Google policy violation.',improvement:'Prepare concise wording using this location’s verified category, services and address. Remove repetition without adding unsupported claims.',aiEligible:true,source:'Saved Google Business Profile description'});

  const specialDates=(profile.observed.specialHours||'').match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];
  if(specialDates.length&&!specialDates.some(date=>date>=now.toISOString().slice(0,10)))findings.push({code:'profile-special-hours',kind:'profile',title:'Confirm upcoming special hours',evidence:`The imported special hours only contain past dates (latest: ${specialDates.sort().at(-1)}). This does not prove Google is missing any required holiday hours.`,improvement:'Confirm upcoming holiday closures or changed hours with the owner. AI can prepare a checklist, but cannot choose opening hours. Keep regular hours unchanged unless the owner confirms a change.',aiEligible:true,source:'Saved Google Business Profile special hours'});
  if(profile.draft)findings.push({code:'profile-draft',kind:'profile',title:'A Google profile draft is waiting for review',evidence:'Tap Rater has a saved profile draft. It has not been published by this workflow.',improvement:'Review the existing draft in Google profile before requesting more changes.',aiEligible:false,source:'Tap Rater saved draft'});
 }
 for(const track of tracks.filter(t=>t.active)){
  const scan=scans.find(s=>s.methodology==='maps-v2'&&s.tracks.some(t=>t.id===track.id&&sameGrid(t.settings,track)));
  if(!scan){findings.push({code:`scan-required:${track.id}`,kind:'system',title:`New scan required: ${track.keyword}`,evidence:'No corrected scan matches the current keyword and area.',improvement:'Review the scan cost in Heat Map and approve a new scan. Do not judge performance from an older area or legacy scan.',aiEligible:false,source:'Heat Map tracking settings'});continue;}
  const points=scan.points.filter(p=>p.trackId===track.id);
  if(points.some(p=>p.state==='error'||p.state==='uncertain')){findings.push({code:`scan-error:${track.id}`,kind:'system',title:`Scan needs attention: ${track.keyword}`,evidence:'Some ranking measurements failed or have an uncertain submission status.',improvement:'Ask Tap Rater to check the provider result. A failed measurement is not a poor ranking. No paid AI fix is needed.',aiEligible:false,source:'Heat Map scan status'});continue;}
  if(!points.length||points.some(p=>p.state!=='complete'))continue;
  const found=points.filter(p=>p.rank!==null).length,top3=points.filter(p=>p.rank!==null&&p.rank<=3).length;
  if(found<points.length||top3<points.length/2)findings.push({code:`visibility:${track.id}`,kind:'heatmap',title:`Improve visibility for “${track.keyword}”`,evidence:`${found}/${points.length} points found the business; ${top3}/${points.length} were in the top 3. ${track.size}×${track.size} grid, ${track.spacingKm} km spacing. Scan: ${new Date(scan.created_at).toISOString().slice(0,10)}.`,improvement:'Review profile relevance, accurate business details, website content, photos and ethical review collection. Distance and competition also affect results. An AI plan cannot change rankings directly or guarantee improvement.',aiEligible:true,source:'Completed corrected DataForSEO Maps scan'});
 }
 return findings;
}
