import type {Finding} from '@/lib/local-issue-rules';
export type Draft={summary:string;steps:string[];proposedDescription:string;questions:string[]};
export type Issue={id:string;business_id:string;business_name:string;fingerprint:string;finding:Finding;read_at:string|null;requested_at:string|null;preview_enabled:boolean;draft_status:string|null;draft:Draft|null;approved_at:string|null};
export type Snapshot={issues:Issue[];locations:{id:string;business_name:string}[];errors:string[]};

export function filterLocalIssues(issues:Issue[],location:string,profileOnly:boolean,heatmapEnabled:boolean){
 return issues.filter(i=>(heatmapEnabled||(i.finding.kind!=='heatmap'&&!i.finding.code.startsWith('scan-')))&&(!location||i.business_id===location)&&(!profileOnly||i.finding.kind==='profile'||['profile-import','connection'].includes(i.finding.code)));
}
export function countUnreadIssues(issues:Issue[]){return issues.filter(i=>!i.read_at).length;}
export type IssueAction=(issue:Issue,action:string,edits?:{draft:Draft;expectedDraft:Draft})=>Promise<boolean>;
