import {liveDb,bindGoogleLocation,clientFor} from './google-business/live-reviews';
import {decryptGoogleSecret,encryptGoogleSecret} from './google-business/token-vault';
import {previewOwner} from './reviews-purchase-preview';

export async function paidReviewPreview(email:string,sql=liveDb()){
 const [row]=await sql`SELECT p.id,p.verified_name AS name,p.verified_address AS address,p.business_id FROM reviews_purchase_previews p JOIN customers c ON c.id=p.customer_id JOIN marketing_subscriptions m ON m.customer_id=c.id AND m.attempt=p.purchase_attempt::text AND m.stripe_mode=p.stripe_mode WHERE lower(c.email)=${email} AND c.account_status='active' AND p.paid_at IS NOT NULL AND p.complete AND c.marketing_onboarding_completed_at IS NULL ORDER BY p.paid_at DESC LIMIT 1`;
 return row||null;
}
/** Invoked only inside the authenticated, paid Reviews onboarding gate. */
export async function resumePaidReviewPreview(email:string,sql=liveDb()){
 const [preview]=await sql`SELECT p.* FROM reviews_purchase_previews p JOIN customers c ON c.id=p.customer_id JOIN marketing_subscriptions m ON m.customer_id=c.id AND m.attempt=p.purchase_attempt::text AND m.stripe_mode=p.stripe_mode WHERE lower(c.email)=${email} AND c.account_status='active' AND c.marketing_onboarding_completed_at IS NULL AND p.paid_at IS NOT NULL AND p.complete ORDER BY p.paid_at DESC LIMIT 1`;
 if(!preview)throw Error('Your saved business is unavailable. Choose a business to continue.');
 const parent=`${preview.google_account}/${preview.google_location}`;
 const [assigned]=await sql`SELECT business_id FROM google_review_links WHERE split_part(parent,'/',4)=split_part(${preview.google_location},'/',2) AND reconnected_to IS NULL LIMIT 1`;
 if(assigned&&String(assigned.business_id)!==String(preview.business_id))throw Error('This location already belongs to another workspace. Contact support; its existing connection has not been changed.');
 // Lock this customer and create at most one NEW business. Never reuse or move an existing workspace.
 const [created]=await sql`WITH account AS MATERIALIZED (SELECT c.id,c.marketing_onboarding_business_id FROM customers c JOIN reviews_purchase_previews p ON p.customer_id=c.id WHERE p.id=${preview.id} AND lower(c.email)=${email} AND c.account_status='active' AND c.marketing_onboarding_completed_at IS NULL FOR UPDATE OF c), chosen AS MATERIALIZED (SELECT CASE WHEN p.business_id IS NOT NULL THEN p.business_id ELSE create_marketing_business(c.id,p.verified_name,p.verified_address) END AS id,c.id AS customer_id FROM account c JOIN reviews_purchase_previews p ON p.customer_id=c.id WHERE p.id=${preview.id} AND (c.marketing_onboarding_business_id IS NULL OR c.marketing_onboarding_business_id=p.business_id)), saved AS (UPDATE reviews_purchase_previews p SET business_id=n.id FROM chosen n WHERE p.id=${preview.id} RETURNING n.id,n.customer_id) UPDATE customers c SET marketing_onboarding_business_id=s.id FROM saved s WHERE c.id=s.customer_id RETURNING s.id`;
 if(!created)throw Error('Setup already has a different business. Finish that setup or contact support.');
 const businessId=String(created.id);
 const [linked]=await sql`SELECT business_id FROM google_review_links WHERE business_id=${businessId} AND customer_id=${preview.customer_id} AND parent=${parent} AND enabled`;
 if(linked)return;
 const oldOwner=previewOwner(preview.id),owner=`customer:${email}:location:${businessId}`;
 const [connection]=await sql`SELECT g.* FROM google_business_connections g JOIN reviews_purchase_previews p ON g.owner='reviews-preview:'||p.id::text WHERE p.id=${preview.id} AND p.customer_id=${preview.customer_id} AND p.paid_at IS NOT NULL AND p.expires_at>now()`;
 if(!connection) return; // The saved business remains selected; ordinary setup offers a fresh connection.
 const subject=String(connection.google_subject);
 const access=encryptGoogleSecret(decryptGoogleSecret(connection.access_ciphertext,`access:${oldOwner}:${subject}`),`access:${owner}:${subject}`);
 const refresh=encryptGoogleSecret(decryptGoogleSecret(connection.refresh_ciphertext,`refresh:${oldOwner}:${subject}`),`refresh:${owner}:${subject}`);
 // Never replace a connection the customer has subsequently made themselves.
 await sql`INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes) VALUES(${owner},${subject},${connection.email},${access},${refresh},${connection.expires_at},${connection.scopes}) ON CONFLICT(owner) DO NOTHING`;
 try{await bindGoogleLocation(owner,businessId,preview.google_account,preview.google_location,sql,clientFor,email);}catch(e){if((e as {code?:string}).code==='23505')throw Error('This Google location is already connected. Contact support; no existing location was moved.');throw e;}
 // Delete this temporary copy, never revoke the Google grant used by other accounts.
 await sql`DELETE FROM google_business_connections WHERE owner=${oldOwner}`;
}
