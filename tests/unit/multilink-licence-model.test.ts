import {describe,expect,it} from 'vitest';
import {buildMultiLinkLicences,describeLicencePlan} from '@/components/account/multilink-licence-model';
import {multiLinkGrantStands,readGrantedStand} from '@/lib/multilink-granted-stand';
import type {CustomerPortalStand,CustomerPortalSubscription} from '@/lib/customer-portal';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';

const subscription=(code:string,extra:Partial<CustomerPortalSubscription>={}):CustomerPortalSubscription=>({id:`sub-${code}`,permanentCode:code,hostedPageUrl:`https://taprater.com/p/${code}`,status:'active',lifecycleStatus:'ACTIVE',cancelAtPeriodEnd:false,billingProfileAvailable:false,...extra});
const page=(code:string,extra:Partial<HostedPageEditorRecord>={}):HostedPageEditorRecord=>({id:`page-${code}`,customerId:'c',customerEmail:'a@b.c',businessId:'b',businessName:'Tap Rater Demo',code,lifecycleStatus:'ACTIVE',draft:{businessName:'Tap Rater Demo',headline:'Rate Your Experience',appearance:{theme:'light',accentColor:'#0f766e'},buttons:[]},...extra} as HostedPageEditorRecord);
const stand:CustomerPortalStand={id:'s1',orderId:'o1',lineItemIndex:0,orderReference:'o1',title:'Rate Your Experience Stand',quantity:1,kind:'multilink',hostedPageCode:'PAGE1',proofStatus:'not_needed',productionStatus:'',shippingStatus:'',primaryActionLabel:'',primaryActionHref:'',multiLinkSetupPending:false};

describe('Multi-Link licence cards',()=>{
  it('makes one card per licence with name, heading and next step',()=>{
    const [card,...rest]=buildMultiLinkLicences({subscriptions:[subscription('PAGE1',{source:'admin'}),subscription('PAGE1')],stands:[],pages:{PAGE1:page('PAGE1')}});
    expect(rest).toHaveLength(0);
    expect(card.name).toBe('Tap Rater Demo');expect(card.heading).toBe('Rate Your Experience');
    expect(card.status.label).toBe('Not published');
    expect(card.plan).toBe('Free licence from Tap Rater · no expiry');
    expect(card.steps.map(step=>step.done)).toEqual([false,false,false]);
    expect(card.editorStand.hostedPageCode).toBe('PAGE1');
  });
  it('shows the stand that opens the page and marks it live once published',()=>{
    const published=page('PAGE1',{publishedAt:'2026-11-20T00:00:00Z',draft:{...page('PAGE1').draft,buttons:[{id:'1',type:'google_review',label:'Google',url:'https://g.page/r/x'}]}} as Partial<HostedPageEditorRecord>);
    const [card]=buildMultiLinkLicences({subscriptions:[subscription('PAGE1')],stands:[stand,{...stand,id:'other',hostedPageCode:'PAGE2'}],pages:{PAGE1:published}});
    expect(card.linkedStands.map(item=>item.id)).toEqual(['s1']);
    expect(card.status.label).toBe('Live');
    expect(card.steps.every(step=>step.done)).toBe(true);
    expect(card.steps[0].detail).toBe('1 link added');
    const [unfinished]=buildMultiLinkLicences({subscriptions:[subscription('PAGE1')],stands:[],pages:{PAGE1:page('PAGE1',{draft:{...page('PAGE1').draft,buttons:[{id:'1',type:'google_review',label:'Google',url:'',enabled:true,position:0},{id:'2',type:'yelp',label:'Yelp',url:'https://yelp.com/x',enabled:true,position:1}]}} as Partial<HostedPageEditorRecord>)}});
    expect(unfinished.steps[0]).toMatchObject({done:true,detail:'1 of 2 links have a web address'});
  });
  it('counts a stand granted by Tap Rater as connected',()=>{
    const granted=readGrantedStand('admin-stand:rate-your-experience-stand:req');
    expect(granted?.headline).toBe('Rate Your Experience');
    const [card]=buildMultiLinkLicences({subscriptions:[subscription('PAGE1',{source:'admin'})],stands:[],pages:{},grantedStands:{PAGE1:granted!}});
    expect(card.steps[2]).toMatchObject({done:true,detail:granted!.title});
  });
  it('shows billing problems before page status',()=>{
    const [card]=buildMultiLinkLicences({subscriptions:[subscription('PAGE1',{lifecycleStatus:'PAST_DUE'})],stands:[],pages:{PAGE1:page('PAGE1',{publishedAt:'2026-11-20T00:00:00Z'})}});
    expect(card.status.label).toBe('Payment needs attention');
  });
  it('describes paid plans in plain words',()=>{
    expect(describeLicencePlan(subscription('A',{source:'subscription',currentPeriodEnd:'2026-12-23T00:00:00Z'}))).toBe('$9.99/month · renews Dec 23, 2026');
    expect(describeLicencePlan(subscription('A',{source:'subscription',currentPeriodEnd:'2026-12-23T00:00:00Z',cancelAtPeriodEnd:true}))).toBe('$9.99/month · ends Dec 23, 2026');
  });
  it('only offers Multi-Link stands for grants and ignores other references',()=>{
    expect(multiLinkGrantStands().some(item=>item.slug==='rate-your-experience-stand')).toBe(true);
    expect(multiLinkGrantStands().some(item=>item.slug==='google-review-stand')).toBe(false);
    expect(readGrantedStand('admin:req')).toBeUndefined();
    expect(readGrantedStand('order:123')).toBeUndefined();
  });
});
