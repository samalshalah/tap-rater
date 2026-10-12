import { metaPixelId } from "@/lib/meta-pixel";

export function GET() {
  const html = `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Marketing measurement</title></head><body><script>
if (parent !== window && location.origin === 'https://taprater.com') {
  const queue = function(){ queue.callMethod ? queue.callMethod.apply(queue,arguments) : queue.queue.push(arguments); };
  queue.queue=[]; queue.push=queue; queue.loaded=true; queue.version='2.0'; window.fbq=queue; window._fbq=queue;
  fbq('set','autoConfig',false,'${metaPixelId}');
  fbq('consent','grant');
  fbq('init','${metaPixelId}');
  const names=new Set(['PageView','ViewContent','AddToCart','InitiateCheckout','Purchase']);
  window.addEventListener('message', function(event) {
    if(event.source!==parent || event.origin!==location.origin || event.data?.type!=='taprater:meta-event' || !names.has(event.data.name)) return;
    const d=event.data.data;
    if(!d || typeof d.page_path!=='string' || !/^\\/[a-z0-9/-]*$/.test(d.page_path)) return;
    const clean={page_path:d.page_path};
    if(event.data.name!=='PageView') {
      if(!Array.isArray(d.contents) || !d.contents.length || d.contents.length>100) return;
      if(!d.contents.every(i=> /^[A-Za-z0-9_-]{1,50}$/.test(i.id) && Number.isInteger(i.quantity) && i.quantity>0 && i.quantity<=99 && Number.isFinite(i.item_price) && i.item_price>=0)) return;
      clean.contents=d.contents.map(i=>({id:i.id,quantity:i.quantity,item_price:i.item_price}));
      clean.content_ids=clean.contents.map(i=>i.id); clean.content_type='product'; clean.currency='USD';
      clean.value=Math.round(clean.contents.reduce((sum,i)=>sum+i.quantity*i.item_price,0)*100)/100;
      clean.num_items=clean.contents.reduce((sum,i)=>sum+i.quantity,0);
    }
    const id=event.data.eventId;
    fbq('trackSingle','${metaPixelId}',event.data.name,clean,typeof id==='string' && /^[a-f0-9-]{36}$/i.test(id)?{eventID:id}:{});
  });
  const script=document.createElement('script'); script.async=true; script.src='https://connect.facebook.net/en_US/fbevents.js'; script.referrerPolicy='no-referrer';
  script.onload=()=>parent.postMessage('taprater:meta-ready',location.origin); document.head.appendChild(script);
}
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
}
