import { z } from 'zod';
import { liveDb, LiveReviewError } from './google-business/live-reviews';
import type { ReviewActor } from './review-workspaces';

const text = (max: number) => z.string().trim().max(max);
export const publicUrl = text(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}, 'Use a public http or https URL.');
export const listingStatuses = ['not_checked','listed','needs_update','missing','unavailable'] as const;
export const localMutation = z.discriminatedUnion('action', [
  z.object({ action:z.literal('createLocation'), customerId:z.string().uuid().optional(), name:text(200).min(1), address:text(1000), phone:text(80), website:publicUrl }).strict(),
  z.object({ action:z.literal('updateLocation'), businessId:z.string().uuid(), name:text(200).min(1), address:text(1000), phone:text(80), website:publicUrl, category:text(100), description:text(750), hours:text(1000), version:z.number().int().positive() }).strict(),
  z.object({ action:z.literal('advanceListing'), businessId:z.string().uuid(), directory:text(100).min(1), state:z.enum(['approved','submitted','resolved']), profileVersion:z.number().int().positive(), version:z.number().int().positive() }).strict(),
  z.object({ action:z.literal('saveListing'), businessId:z.string().uuid(), directory:text(100).min(1), status:z.enum(listingStatuses), listingUrl:publicUrl, listedName:text(200), listedAddress:text(1000), listedPhone:text(80), notes:text(4000), listedWebsite:publicUrl.default(''), checked:z.boolean().default(false), version:z.number().int().nonnegative() }).strict(),
]);
const email = (actor:ReviewActor) => actor.kind==='customer' ? actor.email.trim().toLowerCase() : '';

export async function localSnapshot(actor:ReviewActor, sql=liveDb()) {
  const locations = await sql`SELECT b.id,b.customer_id,b.business_name,b.address,b.phone,b.website_url,b.local_profile_version,b.local_category,b.local_description,b.local_hours,c.email,
   l.title AS google_title,l.enabled,l.synced_at,l.next_page,l.last_error,
   (g.owner IS NOT NULL AND l.enabled) AS connected,
   (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id AND r.fetched_at>now()-interval '30 days') AS review_count,
   (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id AND r.fetched_at>now()-interval '30 days' AND NOT r.suspected_spam AND coalesce(r.data->'reviewReply'->>'comment','')='') AS unanswered_count,
   (SELECT count(*)::int FROM google_live_reviews r WHERE r.business_id=l.business_id AND r.fetched_at>now()-interval '30 days' AND NOT r.suspected_spam AND r.draft<>'') AS draft_count
   FROM businesses b JOIN customers c ON c.id=b.customer_id
   LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id
   LEFT JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
   WHERE c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)})
   ORDER BY c.email,b.business_name,b.address,b.id`;
  const listings = await sql`SELECT d.* FROM local_directory_listings d JOIN businesses b ON b.id=d.business_id JOIN customers c ON c.id=b.customer_id
    WHERE d.customer_id=b.customer_id AND c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) ORDER BY d.directory`;
  const customers = actor.kind==='admin' ? await sql`SELECT id,email FROM customers WHERE account_status='active' ORDER BY email` : [];
  const licenses=actor.kind==='customer'?(await sql`SELECT a.location_limit,a.unlimited_locations,(SELECT count(*)::int FROM marketing_location_access m WHERE m.customer_id=c.id AND m.enabled) AS used FROM customers c JOIN customer_marketing_access a ON a.customer_id=c.id WHERE lower(c.email)=${email(actor)} AND a.status IN ('active','testing') AND (a.expires_at IS NULL OR a.expires_at>now())`)[0]:null;
  return {locations,listings,customers,licenses};
}

export async function mutateLocal(actor:ReviewActor, input:unknown, sql=liveDb()) {
  const v=localMutation.parse(input);
  if(v.action==='createLocation') {
    if(actor.kind==='customer' && v.customerId) throw new LiveReviewError('Customer assignment is managed by Tap Rater.',403);
    if(actor.kind==='admin' && !v.customerId) throw new LiveReviewError('Choose a customer.',400);
    const rows=await sql`SELECT create_marketing_business(c.id,${v.name},${v.address},${v.phone},${v.website}) AS id FROM customers c
      WHERE c.account_status='active' AND ((${actor.kind==='admin'} AND c.id=${v.customerId || null}::uuid) OR (${actor.kind==='customer'} AND lower(c.email)=${email(actor)}))`;
    if(!rows.length)throw new LiveReviewError('Customer unavailable.',404);
    return rows[0];
  }
  if(v.action==='updateLocation') {
    const rows=await sql`UPDATE businesses b SET business_name=${v.name},address=${v.address},phone=${v.phone},website_url=${v.website},
      local_category=${v.category},local_description=${v.description},local_hours=${v.hours},local_profile_version=local_profile_version+1
      FROM customers c WHERE b.id=${v.businessId} AND c.id=b.customer_id AND c.account_status='active'
      AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) AND b.local_profile_version=${v.version} RETURNING b.id`;
    if(!rows.length)throw new LiveReviewError('Location unavailable or profile changed. Reload before saving.',409);
    return rows[0];
  }
  if(v.action==='advanceListing') {
    const previous=v.state==='approved'?'draft':v.state==='submitted'?'approved':'submitted';
    const rows=await sql`UPDATE local_directory_listings d SET correction_state=${v.state},
      approved_profile_version=b.local_profile_version,version=d.version+1,updated_at=now()
      FROM businesses b,customers c WHERE d.business_id=${v.businessId} AND d.directory=${v.directory}
      AND b.id=d.business_id AND b.customer_id=d.customer_id AND c.id=b.customer_id AND c.account_status='active'
      AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)}) AND d.version=${v.version} AND d.correction_state=${previous}
      AND d.checked_at IS NOT NULL AND d.notes<>'' AND b.local_profile_version=${v.profileVersion}
      AND (${v.state==='approved'} OR d.approved_profile_version=b.local_profile_version) RETURNING d.id`;
    if(!rows.length)throw new LiveReviewError('Check the listing and add correction notes first. The profile or correction may have changed; reload and review it.',409);
    return rows[0];
  }
  // Ownership is checked inside the write, including on conflict. Reassignment cannot leak a location.
  const rows=await sql`INSERT INTO local_directory_listings (business_id,customer_id,directory,status,listing_url,listed_name,listed_address,listed_phone,notes,listed_website,checked_at)
    SELECT b.id,b.customer_id,${v.directory},${v.status},${v.listingUrl},${v.listedName},${v.listedAddress},${v.listedPhone},${v.notes},${v.listedWebsite},CASE WHEN ${v.checked} THEN now() ELSE NULL END
    FROM businesses b JOIN customers c ON c.id=b.customer_id
    WHERE b.id=${v.businessId} AND c.account_status='active' AND (${actor.kind==='admin'} OR lower(c.email)=${email(actor)})
    AND (${v.version===0} OR EXISTS (SELECT 1 FROM local_directory_listings d WHERE d.business_id=b.id AND d.directory=${v.directory} AND d.version=${v.version}))
    ON CONFLICT (business_id,directory) DO UPDATE SET status=EXCLUDED.status,listing_url=EXCLUDED.listing_url,
    listed_name=EXCLUDED.listed_name,listed_address=EXCLUDED.listed_address,listed_phone=EXCLUDED.listed_phone,notes=EXCLUDED.notes,listed_website=EXCLUDED.listed_website,checked_at=EXCLUDED.checked_at,correction_state='draft',approved_profile_version=NULL,
    version=local_directory_listings.version+1,updated_at=now()
    WHERE local_directory_listings.version=${v.version} AND local_directory_listings.customer_id=EXCLUDED.customer_id RETURNING id`;
  if(!rows.length)throw new LiveReviewError('Location unavailable or this listing changed. Reload before saving.',409);
  return rows[0];
}
