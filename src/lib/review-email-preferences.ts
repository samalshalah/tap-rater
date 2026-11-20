import {z} from 'zod';
import {liveDb} from './google-business/live-review-core';
const mode=z.enum(['off','immediate','daily']);
export const reviewEmailSettings=z.object({
 businessId:z.string().uuid(),version:z.number().int().nonnegative(),lowMode:mode,highMode:mode,
 weekly:z.boolean(),monthly:z.boolean(),hour:z.number().int().min(0).max(23),
 zone:z.string().min(1).max(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}})
}).strict();
export type ReviewEmailSettings=z.infer<typeof reviewEmailSettings>;
export async function emailLocations(email:string,sql=liveDb()){
 return sql`SELECT b.id,b.business_name,p.low_mode,p.high_mode,p.weekly,p.monthly,p.zone,p.delivery_hour,p.version
 FROM businesses b JOIN customers c ON c.id=b.customer_id
 JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id
 LEFT JOIN review_email_preferences p ON p.business_id=b.id AND p.customer_id=c.id
 WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active' AND l.enabled
 AND b.status IS DISTINCT FROM 'marketing_removed' AND marketing_location_allowed(b.id)
 ORDER BY b.business_name,b.id`;
}
export async function saveEmailPrefs(email:string,v:ReviewEmailSettings,sql=liveDb()){
 const rows=await sql`INSERT INTO review_email_preferences AS p(business_id,customer_id,low_mode,high_mode,weekly,monthly,zone,delivery_hour)
 SELECT b.id,c.id,${v.lowMode},${v.highMode},${v.weekly},${v.monthly},${v.zone},${v.hour}
 FROM businesses b JOIN customers c ON c.id=b.customer_id JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id
 WHERE b.id=${v.businessId} AND lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active'
 AND b.status IS DISTINCT FROM 'marketing_removed' AND l.enabled AND marketing_location_allowed(b.id)
 AND EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=${v.zone})
 AND (${v.version}=0 OR EXISTS(SELECT 1 FROM review_email_preferences prior WHERE prior.business_id=b.id AND prior.version=${v.version}))
 ON CONFLICT(business_id) DO UPDATE SET low_mode=excluded.low_mode,high_mode=excluded.high_mode,weekly=excluded.weekly,
 monthly=excluded.monthly,zone=excluded.zone,delivery_hour=excluded.delivery_hour,version=p.version+1,changed_at=now()
 WHERE p.customer_id=excluded.customer_id AND p.version=${v.version} RETURNING version`;
 return rows[0]?.version;
}
/** Saved preference row (or none yet) → the settings the notification form edits. Unsaved locations start with every email off. */
export function notificationSettingsFromRow(row:{id:string;low_mode?:string|null;high_mode?:string|null;weekly?:boolean|null;monthly?:boolean|null;delivery_hour?:number|null;zone?:string|null;version?:number|null}):ReviewEmailSettings{
 return {businessId:row.id,version:row.version??0,lowMode:(row.low_mode??'off') as ReviewEmailSettings['lowMode'],highMode:(row.high_mode??'off') as ReviewEmailSettings['highMode'],
  weekly:row.weekly??false,monthly:row.monthly??false,hour:row.delivery_hour??9,zone:row.zone??'America/New_York'};
}

/** Alerts switched on when a new subscriber finishes setup: instant emails for 1–3-star reviews and a
 * Monday report. Never overwrites settings the customer already saved (ON CONFLICT DO NOTHING). */
export const defaultReviewAlerts={lowMode:'immediate',highMode:'off',weekly:true,monthly:false,hour:9} as const;
export async function applyDefaultReviewAlerts(email:string,zone:string|undefined,sql=liveDb()){
 const d=defaultReviewAlerts;
 await sql`INSERT INTO review_email_preferences(business_id,customer_id,low_mode,high_mode,weekly,monthly,zone,delivery_hour)
 SELECT b.id,c.id,${d.lowMode},${d.highMode},${d.weekly},${d.monthly},
  COALESCE((SELECT name FROM pg_timezone_names WHERE name=${zone??''} LIMIT 1),'America/New_York'),${d.hour}
 FROM businesses b JOIN customers c ON c.id=b.customer_id JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=c.id
 WHERE lower(c.email)=${email.trim().toLowerCase()} AND c.account_status='active'
 AND b.status IS DISTINCT FROM 'marketing_removed' AND l.enabled AND marketing_location_allowed(b.id)
 ON CONFLICT(business_id) DO NOTHING`;
}
