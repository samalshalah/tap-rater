import {ManagedLocationWorkspace} from '@/components/admin/managed-location-workspace';
import type {OverviewLocation} from '@/components/account/review-overview';
import {localSnapshot} from '@/lib/local-management';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {nextQueueCheck} from '@/components/account/google-live-review-model';
import type {Row,Workspace} from '@/components/account/google-live-review-types';
import {AdminShell} from '@/components/admin/admin-shell';
import {requireAdmin} from '@/lib/admin-auth';
import {liveDb} from '@/lib/google-business/live-review-core';
import {getCustomerPortal} from '@/lib/customer-portal';
import {customerStandRegistry,attachStandRegistry} from '@/lib/customer-stand-registry';

export const dynamic='force-dynamic';
const sections=['Overview','Reviews','Notifications','My Stands','Multi-Link','Orders & Billing','Subscription'] as const;
const pageSize=25;
const money=(cents:number,currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format(cents/100);
type Props={params:Promise<{accountId:string}>;searchParams:Promise<{location?:string;section?:string;page?:string}>};
export default async function ClientAccount({params,searchParams}:Props){
  await requireAdmin();
  const [{accountId},query]=await Promise.all([params,searchParams]);
  const location=query.location||null;
  if(!z.string().uuid().safeParse(accountId).success || (location&&!z.string().uuid().safeParse(location).success))notFound();
  const sql=liveDb();
  const [account]=await sql`SELECT id,name,email,phone,account_status FROM customers WHERE id=${accountId} AND account_status IS DISTINCT FROM 'guest'`;
  if(!account)notFound();
  const locations=await sql`SELECT b.id,b.business_name,b.address,b.phone,l.enabled,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.draft_due_at,
    marketing_location_allowed(b.id) AS allowed,p.version AS notification_version,p.low_mode,p.high_mode,p.weekly,p.monthly,p.delivery_hour,p.zone
    FROM businesses b LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id
    LEFT JOIN review_email_preferences p ON p.business_id=b.id AND p.customer_id=b.customer_id
    WHERE b.customer_id=${accountId} AND b.status IS DISTINCT FROM 'marketing_removed' ORDER BY b.business_name,b.id`;
  const selected=locations.find(b=>b.id===location);
  if(location&&!selected)notFound();
  const visible=selected?[selected]:locations;
  const section=sections.find(item=>item===query.section)||'Overview';
  if(selected&&['Overview','Reviews','Notifications'].includes(section)){
    const allowed=account.account_status==='active'&&Boolean(selected.allowed);
    const snapshot=allowed&&section==='Overview'?await localSnapshot({kind:'customer',email:account.email}):null;
    const overview=snapshot?.locations.find(b=>b.id===location) as OverviewLocation|undefined;
    const notifications=selected.enabled?{businessId:selected.id,version:selected.notification_version??0,lowMode:selected.low_mode||'off',highMode:selected.high_mode||'off',weekly:!!selected.weekly,monthly:!!selected.monthly,hour:selected.delivery_hour??9,zone:selected.zone||'America/New_York'}:null;
    return <ManagedLocationWorkspace accountId={accountId} locationId={selected.id} email={account.email} name={selected.business_name}
      section={section} allowed={allowed} overview={overview?JSON.parse(JSON.stringify(overview)):null} notifications={notifications}/>;
  }
  const rawPage=Number(query.page||1);
  const page=Number.isSafeInteger(rawPage)&&rawPage>0&&rawPage<100000?rawPage:1;
  function href(tab:string,id:string|null=location,n=1){
    const params=new URLSearchParams({section:tab});
    if(id)params.set('location',id);
    if(n>1)params.set('page',String(n));
    return '/admin/customers/'+accountId+'?'+params;
  }
  const reviews=section==='Reviews'?await sql`SELECT r.id,r.data,r.draft,r.publish_state,r.scheduled_at,r.draft_generated_at,r.approved_version,r.old_reply_requested_at,r.auto_schedule_cancelled,r.suspected_spam,
    b.business_name,l.enabled,l.ai_consent,l.auto_enabled,l.auto_four,l.auto_five,l.consent_at,l.draft_due_at,EXISTS (SELECT 1 FROM google_business_connections g WHERE g.owner=l.owner AND g.google_subject=l.google_subject) AS connected
    FROM google_live_reviews r JOIN businesses b ON b.id=r.business_id JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=b.customer_id
    WHERE b.customer_id=${accountId} AND b.status IS DISTINCT FROM 'marketing_removed' AND (${location}::uuid IS NULL OR b.id=${location}::uuid)
    ORDER BY r.data->>'updateTime' DESC NULLS LAST,r.id LIMIT ${pageSize+1} OFFSET ${(page-1)*pageSize}`:[];
  const access=section==='Subscription'?await sql`SELECT status,source,expires_at,location_limit,unlimited_locations,ai_monthly_limit FROM customer_marketing_access WHERE customer_id=${accountId}`:[];
  const commerce=['My Stands','Multi-Link','Orders & Billing','Subscription'].includes(section);
  const portal=commerce?await getCustomerPortal(account.email):null;
  const registry=section==='My Stands'&&portal?.customer?await customerStandRegistry(account.email):[];
  const row=(key:string,title:string,detail?:string)=><li className="border-b border-line py-2" key={key}><strong>{title}</strong>{detail&&<p>{detail}</p>}</li>;
  const empty=(message:string)=><p>{message}</p>;
  return <AdminShell selection={{accountId,locationId:location||'',section,label:selected?.business_name||account.name||account.email}}><section className="tr-admin-section space-y-4">
    <header><p className="text-sm text-muted">Client account · Read-only</p><h1 className="tr-admin-title">{account.name||account.email}</h1>
      <p>{account.email} · {selected?.business_name||'All locations'}</p></header>
    <nav className="flex flex-wrap gap-2" aria-label="Client account sections">{sections.map(tab=><Link key={tab} aria-current={tab===section?'page':undefined} className={tab===section?'tr-button-primary':'tr-button-ghost'} href={href(tab)}>{tab}</Link>)}</nav>
    <h2 className="font-semibold">{section}</h2>
    {section==='Overview'&&<><p>{account.account_status}{account.phone?' · '+account.phone:''}</p>
      <h3>Locations</h3>{!visible.length&&empty('No current locations.')}<ul>{visible.map(b=><li key={b.id} className="border-b border-line py-3"><Link className="underline" href={href('Reviews',b.id)}>{b.business_name}</Link>
      <p>{[b.address,b.phone].filter(Boolean).join(' · ')}</p><p>{b.enabled?'Google Reviews enabled':'Google Reviews inactive'} · Automatic replies {b.enabled&&b.ai_consent&&b.auto_enabled?'on':'off'}</p></li>)}</ul></>}
    {section==='Reviews'&&<>{!reviews.length&&empty('No reviews on this page.')}<ul>{reviews.slice(0,pageSize).map(r=>{
      const data=r.data,reply=data.reviewReply?.comment;
      const rating=({ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5} as Record<string,number>)[data.starRating];
      const nextCheck=nextQueueCheck(r as Row,r as Workspace);
      return <li key={r.id} className="border-b border-line py-3"><strong>{data.reviewer?.displayName||'Google reviewer'} · {rating} stars</strong>
        <p className="text-sm text-muted">{r.business_name} · {String(data.createTime||'').slice(0,10)}</p><p>{data.comment||'Rating only'}</p>
        <p>{reply?'Google reply: '+reply:r.draft?'Draft: '+r.draft:nextCheck?'Queued for automatic reply':'Awaiting reply'}</p>
        {nextCheck&&<p>Next queue check: {new Date(nextCheck).toUTCString()}</p>}
        {r.scheduled_at&&<p>Scheduled: {new Date(r.scheduled_at).toUTCString()}</p>}</li>;
    })}</ul><nav className="flex gap-3" aria-label="Review pages">{page>1&&<Link href={href(section,location,page-1)}>Previous reviews</Link>}{reviews.length>pageSize&&<Link href={href(section,location,page+1)}>Next reviews</Link>}</nav></>}
    {section==='Notifications'&&<>{!visible.length&&empty('No current locations.')}<ul>{visible.map(b=>row(b.id,b.business_name,`1–3 stars: ${b.low_mode||'off'} · 4–5 stars: ${b.high_mode||'off'} · Weekly: ${b.weekly?'on':'off'} · Monthly: ${b.monthly?'on':'off'} · Delivery: ${b.delivery_hour??9}:00 ${b.zone||'America/New_York'}`))}</ul></>}
    {commerce&&<p className="text-sm text-muted">These records belong to the whole account.</p>}
    {commerce&&portal?.customer?.id!==accountId&&empty('Commerce records could not be loaded for this account.')}
    {portal?.customer?.id===accountId&&<>
      {section==='My Stands'&&<>{!portal.stands.length&&!portal.devices.length&&empty('No stands or devices.')}<ul>{attachStandRegistry(portal.stands,[],registry).map(s=>row('stand-'+s.id,s.standLabel||s.title,[s.assignedBusinessName,s.productionStatus,s.shippingStatus].filter(Boolean).join(' · ')))}{portal.devices.map(d=>row(d.id,d.label||d.deviceCode,`${d.status} · ${d.tapCount} taps`))}</ul></>}
      {section==='Multi-Link'&&<>{!portal.subscriptions.length&&empty('No Multi-Link pages.')}<ul>{portal.subscriptions.map(s=>row(s.id,s.permanentCode,[s.hostedPageUrl,s.lifecycleStatus].join(' · ')))}</ul></>}
      {section==='Orders & Billing'&&<><h3>Orders</h3>{!portal.orders.length&&empty('No orders.')}<ul>{portal.orders.map(o=>row(o.id,o.reference,[o.status,o.paymentStatus,money(o.totalCents,o.currency),o.items.map(i=>i.quantity+' × '+i.title).join(', ')].filter(Boolean).join(' · ')))}</ul><h3>Invoices</h3>{!portal.invoices.length&&empty('No invoices.')}<ul>{portal.invoices.map(i=>row(i.id,i.invoiceNumber||'Invoice',[i.paymentStatus||i.status,money(i.totalCents,i.currency)].join(' · ')))}</ul></>}
    </>}
    {section==='Subscription'&&<>{!access.length&&empty('No Google Reviews subscription.')}<ul>{access.map(a=>row('reviews','Google Reviews',[a.status,a.unlimited_locations?'Unlimited locations':a.location_limit+' locations',a.ai_monthly_limit+' monthly replies'].join(' · ')))}
    {portal?.customer?.id===accountId&&portal.subscriptions.map(s=>row(s.id,'Multi-Link · '+s.permanentCode,s.lifecycleStatus))}</ul></>}
  </section></AdminShell>;
}
