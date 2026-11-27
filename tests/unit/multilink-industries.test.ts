import {describe,expect,it} from 'vitest';
import {applyRecommendedLinks,defaultMultiLinkIndustry,multiLinkIndustries,recommendedMultiLinks} from '@/lib/multilink-industries';
import {getHostedButtonMark,hostedButtonGroups,supportedHostedPageButtons} from '@/lib/hosted-page-editor-shared';

const create=(type:string,position:number)=>({id:`new-${type}-${position}`,type,label:supportedHostedPageButtons.find(b=>b.type===type)!.label,url:'',enabled:true,position});

describe('industry presets',()=>{
  it('only recommend link types the page supports, within the 10-link limit',()=>{
    const types=new Set(supportedHostedPageButtons.map(b=>b.type));
    for(const industry of multiLinkIndustries)for(const slug of ['connect-with-us-stand','rate-your-experience-stand','menu-and-order-stand','follow-us-social-media-stand']){
      const links=recommendedMultiLinks(industry.id,slug);
      expect(links.length).toBeGreaterThan(0);
      expect(links.length).toBeLessThanOrEqual(10);
      for(const link of links)expect(types.has(link.type)).toBe(true);
    }
  });
  it('fits the stand: reviews for Rate Your Experience, ordering for Menu and Order',()=>{
    expect(recommendedMultiLinks('beauty-salon-wellness','connect-with-us-stand').map(l=>l.type)).toEqual(['appointment','google_review','tip','gift_cards','instagram']);
    expect(recommendedMultiLinks('healthcare-dental','rate-your-experience-stand').map(l=>l.type)).toEqual(['google_review','healthgrades','vitals','facebook']);
    expect(recommendedMultiLinks('automotive','rate-your-experience-stand').map(l=>l.type)).toEqual(['google_review','dealerrater','cars_com','cargurus','edmunds','autotrader','carfax','facebook']);
    expect(recommendedMultiLinks('restaurant-food','menu-and-order-stand').map(l=>l.type)).toContain('doordash');
    expect(recommendedMultiLinks('legal','follow-us-social-media-stand')[0].type).toBe('linkedin');
    expect(recommendedMultiLinks('restaurant-food','follow-us-social-media-stand')[0].type).toBe('instagram');
  });
  it('picks the business type of a stand made for one industry',()=>{
    expect(defaultMultiLinkIndustry(['healthcare-dental'])).toBe('healthcare-dental');
    expect(defaultMultiLinkIndustry(['restaurant-food','retail-local-business'])).toBe('');
    expect(defaultMultiLinkIndustry(undefined)).toBe('');
  });
  it('keeps every address the customer already typed',()=>{
    const current=[{...create('google_review',0),url:'https://search.google.com/local/writereview?placeid=x'},{...create('website',1),url:'https://shop.example'},{...create('instagram',2)}];
    const next=applyRecommendedLinks(current,recommendedMultiLinks('beauty-salon-wellness','connect-with-us-stand'),create as never);
    expect(next.map(b=>b.type)).toEqual(['appointment','google_review','tip','gift_cards','instagram','website']);
    expect(next.find(b=>b.type==='google_review')?.url).toContain('placeid=x');
    expect(next.find(b=>b.type==='website')?.url).toBe('https://shop.example');
    expect(next.find(b=>b.type==='appointment')?.label).toBe('Book Again');
    expect(next.map(b=>b.position)).toEqual([0,1,2,3,4,5]);
  });
});

describe('link types',()=>{
  it('every type has a picker group and its own badge',()=>{
    const grouped=hostedButtonGroups().flatMap(g=>g.options.map(o=>o.type));
    expect(grouped.sort()).toEqual(supportedHostedPageButtons.map(b=>b.type).sort());
    for(const b of supportedHostedPageButtons)if(b.type!=='custom_link')expect(getHostedButtonMark(b.type).brand).not.toBe('Custom link');
  });
});

import {renderHostedPageHtml} from '@/lib/hosted-pages/render-html';
describe('public page',()=>{
  it('shows the new links with their icons and badges',()=>{
    const html=renderHostedPageHtml({state:'available',snapshot:{schemaVersion:1,code:'6Y2XVQS9QHKM',version:'v1',publishedAt:new Date().toISOString(),lifecycleStatus:'ACTIVE',businessName:'Serenity Day Spa',buttons:[
      {id:'a',label:'Order Online',type:'order',iconKey:'order_online',url:'https://order.example',isVisible:true},
      {id:'b',label:'Leave a Tip',type:'payment',iconKey:'tip',url:'https://tip.example',isVisible:true},
      {id:'c',label:'Tripadvisor',type:'review',iconKey:'tripadvisor',url:'https://tripadvisor.com/x',isVisible:true}]} as never});
    expect(html).toContain('Order Online');
    expect(html).toContain('aria-label="Tripadvisor"');
    expect((html.match(/<svg viewBox="0 0 24 24" aria-hidden="true">/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('<span>TA</span>');
  });
  it('never starts a reviews page with Yelp or sites that only take reviews from people who booked through them',()=>{
    for(const industry of multiLinkIndustries){
      const types=recommendedMultiLinks(industry.id,'rate-your-experience-stand').map(l=>l.type);
      expect(types[0],industry.id).toBe('google_review');
      for(const banned of ['yelp','opentable','resy','booking_com','expedia','airbnb','zocdoc']) expect(types,industry.id).not.toContain(banned);
    }
  });
  it('offers every social platform on a Follow Us page, in that business order',()=>{
    for(const industry of multiLinkIndustries){
      const types=recommendedMultiLinks(industry.id,'follow-us-social-media-stand').map(l=>l.type);
      expect([...types].sort(),industry.id).toEqual(['facebook','instagram','linkedin','pinterest','snapchat','tiktok','x','youtube']);
    }
  });
});
