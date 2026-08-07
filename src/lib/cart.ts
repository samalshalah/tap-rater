import { getActiveProducts, getProductBySlug, getProductPriceCents } from "@/lib/products";
import { getPurchaseOptionForProduct, type PurchaseOptionId } from "@/lib/purchase-options";

export const cartStorageKey = "taprater:cart";

export type CartItem = {
  productId: string;
  optionId?: PurchaseOptionId;
  quantity: number;
  setup?: {
    destinationUrl?: string;
    businessName?: string;
      headline?: string;
      cta?: string;
      logoFileName?: string;
      designNotes?: string;
      proofApproved?: boolean;
      manualCollectionAcknowledged?: boolean;
    };
};

export type CartRow = {
  item: CartItem;
  product: NonNullable<ReturnType<typeof getProductBySlug>>;
  option: ReturnType<typeof getPurchaseOptionForProduct>;
  unitPriceCents: number;
  lineSubtotalCents: number;
};

function isPositiveQuantity(quantity: unknown): quantity is number {
  return typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0;
}

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const activeProductIds = new Set(getActiveProducts().map((product) => product.slug));
  const productById = new Map(getActiveProducts().map((product) => [product.slug, product]));
  const normalized = new Map<string, CartItem>();

  for (const entry of value) {
    const productId = typeof entry?.productId === "string" ? entry.productId : "";
    const quantity = entry?.quantity;
    const product = productById.get(productId);

    if (!activeProductIds.has(productId) || !product || !isPositiveQuantity(quantity)) {
      continue;
    }

    // The option is always derived from the actual product, never trusted
    // from client input -- this removes an entire category of bugs where a
    // stored optionId could mismatch the product it's attached to (e.g. a
    // Standard product's line item claiming Branded + QR pricing).
    const option = getPurchaseOptionForProduct(product);
    const setup = normalizeSetup(entry?.setup);
    const key = getCartItemKey({ productId, optionId: option.id, setup });
    const existing = normalized.get(key);

    normalized.set(key, {
      productId,
      optionId: option.id,
      quantity: (existing?.quantity ?? 0) + quantity,
      setup
    });
  }

  return Array.from(normalized.values());
}

export function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    return normalizeCartItems(JSON.parse(value));
  } catch {
    return [];
  }
}

export function mergeCartItem(items: CartItem[], item: CartItem): CartItem[] {
  return normalizeCartItems([...items, item]);
}

export function updateCartQuantity(items: CartItem[], productId: string, delta: number): CartItem[] {
  return normalizeCartItems(
    items.map((item) =>
      getCartItemKey(item) === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    )
  );
}

export function removeCartItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => getCartItemKey(item) !== productId);
}

export function getCartRows(items: CartItem[]): CartRow[] {
  return normalizeCartItems(items).flatMap((item) => {
    const product = getProductBySlug(item.productId);

    if (!product) {
      return [];
    }

    const option = getPurchaseOptionForProduct(product);
    const unitPriceCents = getProductPriceCents(product);

    return [
      {
        item,
        product,
        option,
        unitPriceCents,
        lineSubtotalCents: unitPriceCents * item.quantity
      }
    ];
  });
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "optionId" | "setup">): string {
  const setup = item.setup ?? {};
  return [
    item.productId,
    item.optionId ?? "standard_direct",
    setup.destinationUrl ?? "",
    setup.businessName ?? "",
    setup.headline ?? "",
    setup.cta ?? "",
    setup.designNotes ?? "",
    setup.logoFileName ?? ""
  ].join("|");
}

function normalizeSetup(value: unknown): CartItem["setup"] {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    destinationUrl: readString(row.destinationUrl),
    businessName: readString(row.businessName),
    headline: readString(row.headline),
    cta: readString(row.cta),
    logoFileName: readString(row.logoFileName),
    designNotes: readString(row.designNotes),
    proofApproved: row.proofApproved === true,
    manualCollectionAcknowledged: row.manualCollectionAcknowledged === true
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function calculateCartTotalCents(items: CartItem[]): number {
  return getCartRows(items).reduce((sum, row) => sum + row.lineSubtotalCents, 0);
}
