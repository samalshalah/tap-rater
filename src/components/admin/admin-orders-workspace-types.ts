import { type AdminOrderAction, type AdminOrderActionSource } from "@/lib/admin-order-actions";
export type AdminOrdersWorkspaceOrder = AdminOrderActionSource & {
  id: string;
  checkoutSessionId: string;
  customerName: string;
  email: string;
  items: AdminOrdersWorkspaceItem[];
  total: string;
  status: "pending_payment" | "paid" | "failed" | "canceled";
  paymentStatus: string;
  createdAt: string;
  shippedAt?: string | null;
  hasArtworkFailure?: boolean;
  hasProductionWarnings?: boolean;
  fulfillmentBadges: Array<{ label: string; tone: "ready" | "warning" | "neutral" }>;
};

export type AdminOrdersWorkspaceItem = {
  key: string;
  title: string;
  quantity: number;
  sku: string;
  optionLabel: string;
  statusLabel: string;
  statusTone: "ready" | "warning" | "neutral";
};

export type AdminOrdersWorkspaceProps = {
  orders: AdminOrdersWorkspaceOrder[];
  configured: boolean;
  initialFilter?: string;
};

export type AdminOrdersFilter = (typeof filterOptions)[number][0];

export const filterOptions = [
  ["all", "All"],
  ["paid", "Paid"],
  ["complimentary", "Complimentary"],
  ["pending", "Pending"],
  ["production", "Needs production"],
  ["artwork_failures", "Artwork failures"],
  ["ready_to_ship", "Ready to ship"],
  ["shipped", "Shipped"],
  ["blocked", "Blocked"]
] as const;

export const bulkActions: Array<{ value: AdminOrderAction; label: string }> = [
  { value: "ready_for_production", label: "Ready for production" },
  { value: "in_production", label: "In production" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "mark_shipped", label: "Mark shipped" },
  { value: "mark_delivered", label: "Mark delivered" },
  { value: "block_order", label: "Block order" }
];
