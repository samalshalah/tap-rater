import {describe,it,expect,vi} from 'vitest';
import {serviceUsage,usageAccount} from '@/lib/admin-service-usage';
import {usageMoney} from '@/components/admin/service-usage';

describe('operational cost reporting',()=>{
  it('keeps unmetered AI unknown and strips client content',()=>{
    const a=usageAccount({id:'one',account_name:'Account One',review_calls:4,known_cost:0,reserved:600,unconfirmed_costs:1,email:'private@example.com',draft:'private',keyword:'private',anchor:{address:'private'}});
    expect(a.aiCostMicros).toBeNull();
    expect(a.knownCostMicros).toBe(0);
    expect(a.reservedMicros).toBe(600);
    expect(a.unconfirmedCosts).toBe(1);
    expect(JSON.stringify(a)).not.toContain('private');
  });
  it('shows fractional-cent provider costs without rounding them to zero',()=>{
    expect(usageMoney(600)).toBe('$0.0006');
    expect(usageMoney(104400)).toBe('$0.1044');
  });
  it('uses the authoritative shared reservation, not an account subtotal, and clamps available funds',async()=>{
    const sql=vi.fn().mockResolvedValueOnce([{id:'one',account_name:'One',reserved:600,known_cost:500}]).mockResolvedValueOnce([{enabled:true,halted:false,monthly_cap_microusd:1000,reserved:1200,month:'2026-10',ai_day:'2026-10-22'}]);
    const data=await serviceUsage(sql as never);
    expect(data.budget?.remainingMicros).toBe(0);
    expect(data.budget?.reservedMicros).toBe(1200);
    expect(data.accounts[0].knownCostMicros).toBe(500);
  });
  it('does not invent a zero-dollar cap when configuration is missing',async()=>{
    const sql=vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect((await serviceUsage(sql as never)).budget).toBeNull();
  });
});
