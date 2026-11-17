import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {z} from 'zod';
import {liveDb,clientFor} from './google-business/live-reviews';
import {beginGoogleConnection,completeGoogleConnection,googleConnectionSummary} from './google-business/connection';
import {addReviewPreviewPage,emptyReviewAnalysis,reviewPreviewSummary,type ReviewPreviewAnalysis} from './reviews-preview-analysis';

export const previewCookie='taprater_reviews_preview';
export const previewFlowCookie='taprater_reviews_preview_flow';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const previewOwner=(id:string)=>`reviews-preview:${id}`;
export const previewSelectionSchema=z.object({placeId:z.string().min(1).max(500),name:z.string().trim().min(1).max(200),formattedAddress:z.string().max(1000)}).strict();
type PreviewRow={id:string;selection:z.infer<typeof previewSelectionSchema>;google_account:string|null;google_location:string|null;verified_name:string|null;verified_address:string|null;analysis:ReviewPreviewAnalysis|null;complete:boolean;next_page:string|null;version:number;purchase_attempt:string|null;session:string};
export async function currentReviewPreview(sql=liveDb()){
 const value=(await cookies()).get(previewCookie)?.value||'';
 const match=/^([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/.exec(value);if(!match||!z.string().uuid().safeParse(match[1]).success)return null;
 const [row]=await sql`SELECT * FROM reviews_purchase_previews WHERE id=${match[1]}::uuid AND secret_hash=${hash(match[2])} AND expires_at>now()`;
 return row?{...row,session:value} as PreviewRow:null;
}
export async function reviewPreviewSnapshot(){
 const row=await currentReviewPreview();if(!row)return {preview:null};
 const connection=await googleConnectionSummary(previewOwner(row.id));
 const [assigned]=row.google_location?await liveDb()`SELECT business_id FROM google_review_links WHERE split_part(parent,'/',4)=split_part(${row.google_location},'/',2) LIMIT 1`:[];
 return {preview:{id:row.id,selection:row.selection,connected:Boolean(connection),googleEmail:connection?.email||null,name:row.verified_name,address:row.verified_address,selected:Boolean(row.google_location),complete:row.complete,locked:Boolean(row.purchase_attempt),alreadyAssigned:Boolean(assigned),analysis:row.analysis?reviewPreviewSummary(row.analysis):null}};
}
export async function startReviewPreview(selection:z.infer<typeof previewSelectionSchema>){
 const sql=liveDb(),id=randomUUID(),secret=randomBytes(32).toString('base64url');
 await sql`INSERT INTO reviews_purchase_previews(id,secret_hash,selection) VALUES(${id},${hash(secret)},${JSON.stringify(selection)}::jsonb)`;
 (await cookies()).set(previewCookie,`${id}.${secret}`,{...cookieOptions,maxAge:86400});
 return reviewPreviewSnapshot();
}
export async function connectReviewPreview(){
 const row=await currentReviewPreview();if(!row||row.purchase_attempt)throw Error('Start a new preview to connect Google.');
 const url=await beginGoogleConnection(previewOwner(row.id),row.session);
 (await cookies()).set(previewFlowCookie,new URL(url).searchParams.get('state')!,{...cookieOptions,maxAge:600});
 return {url};
}
/** Only dispatch a callback when its state matches this browser's separate preview flow. */
export async function isReviewPreviewCallback(state:string|null){return Boolean(state&&(await cookies()).get(previewFlowCookie)?.value===state);}
export async function completeReviewPreviewConnection(state:string,code:string){
 const row=await currentReviewPreview();if(!row||row.purchase_attempt)throw Error('Preview expired.');
 await completeGoogleConnection(previewOwner(row.id),row.session,state,code);
 await liveDb()`UPDATE reviews_purchase_previews SET google_account=NULL,google_location=NULL,verified_name=NULL,verified_address=NULL,analysis=NULL,complete=false,next_page=NULL,version=version+1 WHERE id=${row.id} AND purchase_attempt IS NULL`;
}
export async function selectReviewPreview(account:string,location:string){
 const row=await currentReviewPreview();if(!row||row.purchase_attempt)throw Error('Start a new preview to change your business.');
 const client=await clientFor(previewOwner(row.id));
 // The public Places result is a hint. Only a matching authorized Google location is accepted.
 const anchor=await client.getMapAnchor(location);
 if(!anchor.placeId||anchor.placeId!==row.selection.placeId)throw Error('This is a different business. Choose the Google location matching your search, or start again.');
 // listReviews verifies access to the exact account/location pair, before storing it.
 const parent=`${account}/${location}`,page=await client.listReviews(parent),profile=await client.getProfile(location);
 const analysis=addReviewPreviewPage(emptyReviewAnalysis(),page,parent);
 const updated=await liveDb()`UPDATE reviews_purchase_previews SET google_account=${account},google_location=${location},verified_name=${profile.name},verified_address=${profile.address},analysis=${JSON.stringify(analysis)}::jsonb,complete=${!page.nextPageToken},next_page=${page.nextPageToken||null},version=version+1 WHERE id=${row.id} AND version=${row.version} AND purchase_attempt IS NULL RETURNING id`;
 if(!updated.length)throw Error('Your preview changed. Refresh and try again.');
 return reviewPreviewSnapshot();
}
export async function continueReviewPreview(){
 const row=await currentReviewPreview();if(!row?.google_location)throw Error('Choose your Google location first.');
 if(row.complete||row.purchase_attempt)return reviewPreviewSnapshot();
 const client=await clientFor(previewOwner(row.id)),parent=`${row.google_account}/${row.google_location}`;
 const page=await client.listReviews(parent,row.next_page||undefined);
 const analysis=addReviewPreviewPage(row.analysis as ReviewPreviewAnalysis,page,parent);
 // Optimistic concurrency: retries and duplicate browser requests cannot double-count a page.
 await liveDb()`UPDATE reviews_purchase_previews SET analysis=${JSON.stringify(analysis)}::jsonb,complete=${!page.nextPageToken},next_page=${page.nextPageToken||null},version=version+1 WHERE id=${row.id} AND version=${row.version} AND purchase_attempt IS NULL`;
 return reviewPreviewSnapshot();
}
export async function reserveReviewPreview(email:string,attempt:string,mode:string){
 const row=await currentReviewPreview();if(!row?.complete||!row.google_location)throw Error('Connect Google and finish your review analysis before checkout.');
 const sql=liveDb();
 const [assigned]=await sql`SELECT business_id FROM google_review_links WHERE split_part(parent,'/',4)=split_part(${row.google_location},'/',2) LIMIT 1`;
 if(assigned)throw Error('This location already has a Tap Rater connection. Sign in to its existing account or contact support. No new subscription is needed.');
 const [reserved]=await sql`UPDATE reviews_purchase_previews p SET customer_id=c.id,purchase_attempt=${attempt}::uuid,stripe_mode=${mode},expires_at=now()+interval '8 days' FROM customers c WHERE p.id=${row.id} AND p.complete AND lower(c.email)=${email.toLowerCase()} AND (p.purchase_attempt IS NULL OR (p.customer_id=c.id AND p.stripe_mode=${mode} AND (p.purchase_attempt=${attempt}::uuid OR (p.paid_at IS NULL AND EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=c.id AND m.stripe_mode=p.stripe_mode AND m.attempt=p.purchase_attempt::text AND m.status='incomplete_expired'))))) RETURNING p.id,p.verified_name`;
 if(!reserved)throw Error('This preview belongs to another checkout. Start a new business preview.');
 return reserved;
}
