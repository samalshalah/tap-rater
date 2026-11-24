import type {CustomerPortalStand,CustomerPortalSubscription} from '@/lib/customer-portal';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
import {hostedMultiLinkServiceAddon} from '@/lib/service-addons';
import type {GrantedStand} from '@/lib/multilink-granted-stand';
import {badgeTone,date,money,statusText,subscriptionStatus} from './billing-display';

export type MultiLinkLicenceStep = {label:string;detail:string;done:boolean};
export type MultiLinkLicence = {
  code:string;
  subscription:CustomerPortalSubscription;
  /** Stand record the page editor dialog opens with. */
  editorStand:CustomerPortalStand;
  page?:HostedPageEditorRecord;
  /** Physical stands printed with this page's link. */
  linkedStands:CustomerPortalStand[];
  /** Stand chosen when Tap Rater granted the licence. */
  grantedStand?:GrantedStand;
  name:string;
  heading?:string;
  logoUrl?:string;
  status:{label:string;tone:string};
  plan:string;
  steps:MultiLinkLicenceStep[];
};

const inactive=new Set(['expired','EXPIRED','cancelled','canceled','past_due','PAST_DUE','unpaid','CANCELLED_AT_PERIOD_END']);

export function describeLicencePlan(subscription:CustomerPortalSubscription){
  if(subscription.source==='admin')return `Free licence from Tap Rater · ${subscription.currentPeriodEnd?`until ${date(subscription.currentPeriodEnd)}`:'no expiry'}`;
  if(subscription.source==='manual')return 'Managed by Tap Rater';
  const monthly=`${money(hostedMultiLinkServiceAddon.monthlyPriceCents).replace('.00','')}/month`;
  if(!subscription.currentPeriodEnd)return monthly;
  return `${monthly} · ${subscription.cancelAtPeriodEnd?'ends':'renews'} ${date(subscription.currentPeriodEnd)}`;
}

/** One card per Multi-Link licence: the licence, its page and the stands that open it. */
export function buildMultiLinkLicences({subscriptions,stands,pages,grantedStands={}}:{subscriptions:CustomerPortalSubscription[];stands:CustomerPortalStand[];pages:Record<string,HostedPageEditorRecord>;grantedStands?:Record<string,GrantedStand>}):MultiLinkLicence[]{
  const seen=new Set<string>();
  return subscriptions.flatMap(subscription=>{
    const code=subscription.permanentCode.trim();
    if(!code||seen.has(code))return [];
    seen.add(code);
    const page=pages[code],grantedStand=grantedStands[code];
    const forPage=stands.filter(stand=>stand.kind==='multilink'&&(stand.hostedPageCode===code||(!!stand.hostedPageUrl&&stand.hostedPageUrl===subscription.hostedPageUrl)));
    const linkedStands=forPage.filter(stand=>stand.orderId);
    const editorStand:CustomerPortalStand=forPage[0]??{
      id:`page-${subscription.id}`,orderId:'',lineItemIndex:0,orderReference:'',title:'Multi-Link page',quantity:1,
      kind:'multilink',hostedPageCode:code,hostedPageUrl:subscription.hostedPageUrl,multiLinkSetupPending:false,
      proofStatus:'not_needed',productionStatus:'',shippingStatus:'',primaryActionLabel:'Edit links',primaryActionHref:'/account/multilink'
    };
    const name=page?.draft.businessName||page?.businessName||linkedStands[0]?.businessName||'Multi-Link page';
    const headingText=page?.draft.headline?.trim();
    const heading=headingText&&headingText!==name?headingText:undefined;
    const billing=subscriptionStatus(subscription);
    const status=inactive.has(billing)
      ?{label:statusText(billing),tone:badgeTone(billing)||'is-danger'}
      :page?.publishedAt?{label:'Live',tone:'is-success'}:{label:'Not published',tone:'is-warning'};
    const links=page?.draft.buttons.length??0;
    const ready=page?.draft.buttons.filter(button=>button.url.trim()).length??0;
    const standNames=[...new Set(linkedStands.map(stand=>stand.standLabel||stand.title))];
    const units=linkedStands.reduce((total,stand)=>total+Math.max(1,stand.quantity),0);
    const steps:MultiLinkLicenceStep[]=[
      {label:'Add your links',done:ready>0,detail:!links?'No links yet':ready===links?`${links} link${links===1?'':'s'} added`:`${ready} of ${links} links have a web address`},
      {label:'Publish the page',done:Boolean(page?.publishedAt),detail:page?.publishedAt?`Published ${date(page.publishedAt)}`:'Customers can’t see it yet'},
      {label:'Connect a stand',done:linkedStands.length>0||Boolean(grantedStand),detail:linkedStands.length?(units>1?`${units} stands`:standNames[0]):grantedStand?grantedStand.title:'No stand opens this page yet'}
    ];
    return [{code,subscription,editorStand:{...editorStand,title:heading?`${name} — ${heading}`:name},page,linkedStands,grantedStand,name,heading,logoUrl:page?.draft.logoUrl,status,plan:describeLicencePlan(subscription),steps}];
  });
}
