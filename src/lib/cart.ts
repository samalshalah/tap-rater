import { getActiveProducts, getProductBySlug } from "@/lib/products";
import { getProductPurchaseOptions, getPurchaseOption, standardDirectOption, type PurchaseOptionId } from "@/lib/purchase-options";

export type CartProductSnapshot = {
  title: string;
  sku: string;
  shortDescription: string;
};

export const cartStorageKey = "taprater:cart";

export type CartItem = {
  productId: string;
  optionId?: PurchaseOptionId;
  quantity: number;
  productSnapshot?: CartProductSnapshot;
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
  product: CartProductSnapshot;
  option: NonNullable<ReturnType<typeof getPurchaseOption>>;
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
    const productSnapshot = normalizeProductSnapshot(entry?.productSnapshot);

    if (!productId || !isPositiveQuantity(quantity) || (!activeProductIds.has(productId) && !productSnapshot)) {
      continue;
    }

    const requestedOption = typeof entry?.optionId === "string" ? getPurchaseOption(entry.optionId) : undefined;
    const productOptions = product ? getProductPurchaseOptions(product) : [];
    const option =
      requestedOption && (productOptions.length === 0 || productOptions.some((item) => item.id === requestedOption.id))
        ? requestedOption
        : productOptions[0] ?? standardDirectOption;
    const setup = normalizeSetup(entry?.setup);
    const key = getCartItemKey({ productId, optionId: option.id, setup });
    const existing = normalized.get(key);
    const snapshot = productSnapshot ?? (product ? productToSnapshot(product) : undefined);
    if (!snapshot) {
      continue;
    }

    normalized.set(key, {
      productId,
      optionId: option.id,
      quantity: (existing?.quantity ?? 0) + quantity,
      productSnapshot: snapshot,
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
    const option = (item.optionId ? getPurchaseOption(item.optionId) : undefined) ?? standardDirectOption;

    if (!product) {
      const productSnapshot = item.productSnapshot;
      if (!productSnapshot) {
        return [];
      }

      return [
        {
          item,
          product: productSnapshot,
          option,
          unitPriceCents: option.priceCents,
          lineSubtotalCents: option.priceCents * item.quantity
        }
      ];
    }

    const unitPriceCents = option.priceCents;

    return [
      {
        item,
        product: productToSnapshot(product),
        option,
        unitPriceCents,
        lineSubtotalCents: unitPriceCents * item.quantity
      }
    ];
  });
}

function productToSnapshot(product: NonNullable<ReturnType<typeof getProductBySlug>>): CartProductSnapshot {
  return {
    title: product.title,
    sku: product.sku,
    shortDescription: product.shortDescription
  };
}

function normalizeProductSnapshot(value: unknown): CartProductSnapshot | undefined {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const title = readString(row.title);
  const sku = readString(row.sku);
  const shortDescription = readString(row.shortDescription);

  return title && sku && shortDescription
    ? {
        title,
        sku,
        shortDescription
      }
    : undefined;
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "optionId" | "setup">): string {
  const setup = item.setup ?? {};
  return [
    item.productId,
    item.optionId ?? standardDirectOption.id,
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
