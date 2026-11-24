import {expect,it,vi} from 'vitest';
import {getHostedPageInsights,readInsightRange} from '@/lib/hosted-page-insights';

it('reads only supported date ranges',()=>{
  expect(readInsightRange('7')).toBe(7);expect(readInsightRange('90')).toBe(90);expect(readInsightRange('365')).toBe(30);expect(readInsightRange(null)).toBe(30);
});
it('turns query rows into insights for one page and range',async()=>{
  const answers=[
    [{opens:'12',clicks:'5'}],
    [{date:'2026-11-23',opens:'7',clicks:'3'}],
    [{source:'nfc',opens:'8'},{source:'qr',opens:'4'}],
    [{button_id:'g1',button_type:'google_review',clicks:'4'}],
    [{weekday:6,opens:'9'}],
    [{hour:15,opens:'6'}],
    [{device:'ios',opens:'10'}],
    [{stand_id:'ST-ABCD1234',label:'Service desk',location:'Demo Motors',opens:'5',clicks:'2'}]
  ];
  const sql=vi.fn(async()=>answers.shift());
  const insights=await getHostedPageInsights('6Y2XVQS9QHKM',30,sql as never);
  expect(insights).toMatchObject({days:30,opens:12,clicks:5,bySource:[{source:'nfc',opens:8},{source:'qr',opens:4}],byButton:[{buttonId:'g1',buttonType:'google_review',clicks:4}],byStand:[{standId:'ST-ABCD1234',label:'Service desk',location:'Demo Motors',opens:5,clicks:2}]});
  for(const call of sql.mock.calls as unknown as unknown[][])expect(call.slice(1)).toContain('6Y2XVQS9QHKM');
});
