import {googleReviewManagementUrl,policyReasons,type ReviewPolicyCheck} from '@/lib/review-policy';

export function ReviewPolicyPanel({check}:{check?:ReviewPolicyCheck|null}){
 const issue=check&&(check.finding==='possible'||check.finding==='needs_context')?check:null;
 return <section className="tr-review-detail-section" aria-label="Google review policy check">
  <h3>Review policy check</h3>
  <p>{issue?(issue.finding==='possible'?'Possible policy issue':'More context needed')+' · '+policyReasons[issue.reason]:
   check?.finding==='rating_only'?'Rating only. There is no written evidence to assess.':
   check?.finding==='no_issue'?'No clear policy issue found in the review text.':'Policy check pending.'}</p>
  {issue&&<><p>{issue.evidence}</p><p>Review the context before deciding whether to report.</p></>}
  {check&&<>
  <a href={googleReviewManagementUrl} target="_blank" rel="noopener noreferrer" className="underline">Open Google’s Reviews Management Tool ↗</a>
  <small className="block">You decide whether to submit a report in your Google account.</small></>}
 </section>;
}
