import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), order: vi.fn(), stands: vi.fn(), deliveries: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/customer-stand-registry", () => ({ orderStandRegistry: mocks.stands }));
vi.mock("@/lib/email-deliveries", () => ({ getAdminEmailDeliveries: mocks.deliveries }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
vi.mock("@/lib/orders", () => ({ getAdminOrderById: mocks.order, getOrderLineItemProductionSummary: vi.fn(), getAdminOrderArtworkUrl: vi.fn(), getOrderProductionBlockers: () => [] }));
vi.mock("@/lib/products", () => ({ formatPrice: String }));
vi.mock("@/lib/complimentary-orders", () => ({ canChangeComplimentaryStand: () => false }));
vi.mock("@/lib/order-fulfillment-rules", () => ({ canRunOrderProductionActions: () => false }));
vi.mock("@/lib/order-reference", () => ({ formatOrderReference: String }));
vi.mock("@/components/admin/order-detail-components", () => ({ InfoCard: () => null, OrderAttentionCard: () => null, Field: () => null, AddressBlock: () => null, LineItemDetail: () => null, readNested: () => null, formatPaymentStatus: () => "Paid", buildAttentionItems: () => [] }));
vi.mock("@/components/admin/email-delivery-history", () => ({ EmailDeliveryHistory: () => null }));
vi.mock("@/components/admin/order-customer-email", () => ({ OrderCustomerEmail: () => null }));
vi.mock("@/components/admin/admin-shell", () => ({ AdminShell: () => null }));
vi.mock("@/components/admin/admin-ui", () => ({ AdminAlert: () => null, AdminLinkButton: () => null }));
vi.mock("@/components/admin/order-fulfillment-form", () => ({ OrderFulfillmentForm: () => null }));
vi.mock("@/components/admin/order-production-actions", () => ({ OrderProductionActions: () => null }));
vi.mock("@/components/admin/order-refund-form", () => ({ OrderRefundForm: () => null }));
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";
const run = () => AdminOrderDetailPage({ params: Promise.resolve({ id: "order-1" }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({});
  mocks.order.mockResolvedValue({ configured: true, order: { id: "order-1", line_items_json: [], production_status: "pending", shipping_status: "pending", status: "pending_payment", customer_details_json: {} } });
  mocks.stands.mockResolvedValue([]);
  mocks.deliveries.mockResolvedValue({ deliveries: [] });
});
describe("admin order supporting reads", () => {
  it("starts email history while stand records are still pending", async () => {
    let finishStands!: (value: never[]) => void;
    mocks.stands.mockReturnValue(new Promise(resolve => { finishStands = resolve; }));
    const page = run();
    await vi.waitFor(() => expect(mocks.deliveries).toHaveBeenCalledWith("order-1"));
    expect(mocks.stands).toHaveBeenCalledWith("order-1");
    finishStands([]);
    expect(await page).toBeTruthy();
  });
  it("does not read order data before authorization succeeds", async () => {
    mocks.auth.mockRejectedValue(new Error("unauthorized"));
    await expect(run()).rejects.toThrow("unauthorized");
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.stands).not.toHaveBeenCalled();
    expect(mocks.deliveries).not.toHaveBeenCalled();
  });
  it("does not start supporting reads for a missing order", async () => {
    mocks.order.mockResolvedValue({ configured: true, order: null });
    await expect(run()).rejects.toThrow("not found");
    expect(mocks.stands).not.toHaveBeenCalled();
    expect(mocks.deliveries).not.toHaveBeenCalled();
  });
  it("propagates supporting read failures instead of rendering partial data", async () => {
    mocks.deliveries.mockRejectedValue(new Error("history unavailable"));
    await expect(run()).rejects.toThrow("history unavailable");
  });
});
