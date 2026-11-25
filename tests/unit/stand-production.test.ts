import {describe,expect,it} from 'vitest';
import {standsToMake,standTargets} from '@/lib/stand-production';
import {renderPrintArtwork,replacePrintArtworkQr} from '@/lib/print-artwork-renderer';
import {attachStandRegistry} from '@/lib/customer-stand-registry';
import type {OrderLineItem} from '@/lib/order-types';

const page='https://taprater.com/p/ZGBC6FKZH7T3';
const line='11111111-1111-4111-8111-111111111111';
const item=(extra:Partial<OrderLineItem>={},setup:Record<string,unknown>={})=>({productId:'rate-your-experience-stand',optionId:'branded_qr_direct',quantity:2,standLineId:line,setup:{qrTargetUrl:page,generatedQrValue:page,nfcTargetUrl:page,...setup},...extra} as unknown as OrderLineItem);
const registry=[
  {public_id:'ST-AAAA1111BBBB2222',line_id:line,unit_number:2,draft_label:'Showroom'},
  {public_id:'ST-CCCC3333DDDD4444',line_id:line,unit_number:1,draft_label:''},
  {public_id:'ST-EEEE5555FFFF6666',line_id:line,unit_number:3,draft_label:''},
  {public_id:'ST-OTHER000000000',line_id:'other',unit_number:1}
];

describe('standsToMake',()=>{
  it('gives every stand of a Multi-Link line its own QR and NFC link',()=>{
    const stands=standsToMake(item(),registry);
    expect(stands.map(s=>s.unitNumber)).toEqual([1,2]);
    expect(stands[0]).toMatchObject({standId:'ST-CCCC3333DDDD4444',ownLink:true,qrUrl:`${page}?s=qr&st=ST-CCCC3333DDDD4444`,nfcUrl:`${page}?s=nfc&st=ST-CCCC3333DDDD4444`});
    expect(stands[1].label).toBe('Showroom');
  });
  it('leaves a direct Google link the same on every stand',()=>{
    const google='https://search.google.com/local/writereview?placeid=abc';
    const stands=standsToMake(item({},{qrTargetUrl:google,generatedQrValue:google,nfcTargetUrl:google}),registry);
    expect(stands.every(s=>!s.ownLink&&s.qrUrl===google&&s.nfcUrl===google)).toBe(true);
  });
  it('has no QR for NFC-only stands',()=>{
    expect(standTargets(item({optionId:'standard_direct'}),'ST-CCCC3333DDDD4444')).toMatchObject({qrUrl:null,nfcUrl:`${page}?s=nfc&st=ST-CCCC3333DDDD4444`});
  });
});

describe('replacePrintArtworkQr',()=>{
  it('swaps only the QR in the approved print file',async()=>{
    const template={id:'t',version:'1',templateUrl:'/x.png',widthPx:1280,heightPx:1950,dpi:300,widthIn:4.26,heightIn:6.5,logoRegion:{x:300,y:80,width:680,height:400},businessNameRegion:{x:300,y:520,width:680,height:120},qrRegion:{x:440,y:1300,width:400,height:400}} as never;
    const original=await renderPrintArtwork({template,design:{businessName:'Priority Toyota',qrTargetUrl:page,fontSizePercent:100,logoSizePercent:100,logoFitMode:'contain',logoOffsetXPercent:0,logoOffsetYPercent:0,showBusinessName:true},templateDataUri:'data:image/png;base64,AA==',logoDataUri:'data:image/png;base64,AA==',title:'Stand',metadata:{qrTargetUrl:page}});
    const tagged=`${page}?s=qr&st=ST-CCCC3333DDDD4444`;
    const replaced=await replacePrintArtworkQr(original,tagged);
    const expected=await renderPrintArtwork({template,design:{businessName:'Priority Toyota',qrTargetUrl:tagged,fontSizePercent:100,logoSizePercent:100,logoFitMode:'contain',logoOffsetXPercent:0,logoOffsetYPercent:0,showBusinessName:true},templateDataUri:'data:image/png;base64,AA==',logoDataUri:'data:image/png;base64,AA==',title:'Stand',metadata:{qrTargetUrl:tagged}});
    expect(replaced).toBe(expected);
    expect(replaced).not.toBe(original);
  });
});

describe('attachStandRegistry',()=>{
  it('shows each Multi-Link stand its own links',()=>{
    const stand={id:'s1',orderId:'o1',standLineId:line,unitNumber:1,lineItemIndex:0,orderReference:'',title:'Stand',quantity:1,kind:'multilink',qrTargetUrl:page,nfcTargetUrl:page} as never;
    const [result]=attachStandRegistry([stand],[],[{order_id:'o1',line_id:line,unit_number:1,public_id:'ST-CCCC3333DDDD4444',id:'r1',assignment_version:0}]);
    expect(result).toMatchObject({standId:'ST-CCCC3333DDDD4444',qrTargetUrl:`${page}?s=qr&st=ST-CCCC3333DDDD4444`,nfcTargetUrl:`${page}?s=nfc&st=ST-CCCC3333DDDD4444`});
  });
});
