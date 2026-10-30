import {afterEach,expect,it,vi} from "vitest";
import {marketingCheckoutEnabled,createMarketingCheckout} from "@/lib/marketing-subscriptions";
afterEach(()=>vi.unstubAllEnvs());
it("blocks new Growth purchases even when the old release environment is enabled",async()=>{
 vi.stubEnv("MARKETING_CHECKOUT_ENABLED","true");vi.stubEnv("MARKETING_PORTAL_CONFIGURATION_ID","default");
 expect(marketingCheckoutEnabled()).toBe(false);
 await expect(createMarketingCheckout("buyer@example.test",{cadence:"month",locations:1,acceptedTerms:true},"test",{mode:"payment"})).rejects.toThrow("not available");
});
