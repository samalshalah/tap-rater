import { beforeEach, describe, expect, it, vi } from "vitest";
const query = vi.hoisted(() => ({ result: vi.fn() }));
vi.mock("@/lib/db", () => ({
  hasSupabaseAdminConfig: () => true,
  getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: query.result }) }) }) })
}));
import { getBusinessUseGuide } from "@/lib/business-use-guide-store";

describe("business guide compatibility", () => {
  beforeEach(() => query.result.mockReset());
  it("adds new restaurant sections to older saved guides without replacing custom copy or empty FAQs", async () => {
    query.result.mockResolvedValue({ data: { payload: { headline: "Our restaurant guide", faqs: [], recommendations: [] } }, error: null });
    const guide = await getBusinessUseGuide("restaurant-food");
    expect(guide.headline).toBe("Our restaurant guide");
    expect(guide.placements).toHaveLength(3);
    expect(guide.steps).toHaveLength(3);
    expect(guide.faqs).toEqual([]);
    expect(guide.recommendations).toEqual([]);
  });
  it("does not copy restaurant content to another business", async () => {
    query.result.mockResolvedValue({ data: null, error: null });
    const guide = await getBusinessUseGuide("healthcare-dental");
    expect(guide.placements).toBeUndefined();
    expect(guide.headline).toBe("");
  });
  it("surfaces malformed saved data rather than allowing an editor to overwrite it with defaults", async () => {
    query.result.mockResolvedValue({ data: { payload: [] }, error: null });
    await expect(getBusinessUseGuide("restaurant-food")).rejects.toThrow("invalid");
  });
});
