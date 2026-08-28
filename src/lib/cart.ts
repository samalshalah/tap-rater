import { getActiveProducts, getProductBySlug } from "@/lib/products";
import {
  getProductPurchaseOptions,
  getPurchaseOption,
  isHostedPurchaseOptionEnabled,
  standardDirectOption,
  type PurchaseOption,
  type PurchaseOptionId
} from "@/lib/purchase-options";

export type CartProductSnapshot = {
  title: string;
  sku: string;
  baseSku?: string;
  finalSku?: string;
  shortDescription: string;
};

export const cartStorageKey = "taprater:cart";

export type CartItem = {
  productId: string;
  optionId?: PurchaseOptionId;
  quantity: number;
  productSnapshot?: CartProductSnapshot;
  setup?: {
    productSlug?: string;
    optionCode?: PurchaseOptionId;
    baseSku?: string;
    finalSku?: string;
    purchaseOptionLabel?: string;
    sizeCode?: string;
    sizeLabel?: string;
    colorCode?: string;
    colorLabel?: string;
    destinationUrl?: string;
    destinationType?: string;
    platformSlug?: string;
    googlePlaceId?: string;
    googlePlaceName?: string;
    businessName?: string;
    headline?: string;
    cta?: string;
    logoFileName?: string;
    logoMediaUrl?: string;
    logoStorageKey?: string;
    generatedQrValue?: string;
    qrTargetUrl?: string;
    nfcTargetUrl?: string;
    frontTemplateUrl?: string;
    centerAssetUrl?: string;
    ctaText?: string;
    proofApprovalSnapshot?: Record<string, unknown>;
    proofApprovedAt?: string;
    proofPreviewData?: Record<string, unknown>;
    hasQr?: boolean;
    nfcOnly?: boolean;
    priceCents?: number;
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
    if (product && productOptions.length === 0) {
      continue;
    }
    if (requestedOption && !isCartOptionAccepted(requestedOption, productOptions, Boolean(product))) {
      continue;
    }

    const option = requestedOption ?? productOptions[0] ?? standardDirectOption;
    if (option.id === "hosted_multilink" && !isHostedPurchaseOptionEnabled()) {
      continue;
    }
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
    baseSku: product.sku,
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
        baseSku: readString(row.baseSku),
        finalSku: readString(row.finalSku),
        shortDescription
      }
    : undefined;
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "optionId" | "setup">): string {
  const setup = item.setup ?? {};
  return [
    item.productId,
    item.optionId ?? standardDirectOption.id,
    setup.baseSku ?? "",
    setup.finalSku ?? "",
    setup.purchaseOptionLabel ?? "",
    setup.sizeCode ?? "",
    setup.colorCode ?? "",
    setup.destinationUrl ?? "",
    setup.destinationType ?? "",
    setup.platformSlug ?? "",
    setup.googlePlaceId ?? "",
    setup.businessName ?? "",
    setup.headline ?? "",
    setup.cta ?? "",
    setup.designNotes ?? "",
    setup.logoFileName ?? "",
    setup.logoMediaUrl ?? "",
    setup.logoStorageKey ?? "",
    setup.generatedQrValue ?? "",
    setup.qrTargetUrl ?? "",
    setup.nfcTargetUrl ?? "",
    setup.frontTemplateUrl ?? "",
    setup.centerAssetUrl ?? "",
    setup.ctaText ?? ""
  ].join("|");
}

function isCartOptionAccepted(option: PurchaseOption, productOptions: PurchaseOption[], hasCatalogProduct: boolean) {
  if (option.id === "hosted_multilink" && !isHostedPurchaseOptionEnabled()) {
    return false;
  }

  if (hasCatalogProduct) {
    return productOptions.some((item) => item.id === option.id);
  }

  return option.id !== "hosted_multilink" || isHostedPurchaseOptionEnabled();
}

function normalizeSetup(value: unknown): CartItem["setup"] {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    productSlug: readString(row.productSlug),
    optionCode: readPurchaseOptionId(row.optionCode),
    baseSku: readString(row.baseSku),
    finalSku: readString(row.finalSku),
    purchaseOptionLabel: readString(row.purchaseOptionLabel),
    sizeCode: readString(row.sizeCode),
    sizeLabel: readString(row.sizeLabel),
    colorCode: readString(row.colorCode),
    colorLabel: readString(row.colorLabel),
    destinationUrl: readString(row.destinationUrl),
    destinationType: readString(row.destinationType),
    platformSlug: readString(row.platformSlug),
    googlePlaceId: readString(row.googlePlaceId),
    googlePlaceName: readString(row.googlePlaceName),
    businessName: readString(row.businessName),
    headline: readString(row.headline),
    cta: readString(row.cta),
    logoFileName: readString(row.logoFileName),
    logoMediaUrl: readString(row.logoMediaUrl),
    logoStorageKey: readString(row.logoStorageKey),
    generatedQrValue: readString(row.generatedQrValue),
    qrTargetUrl: readString(row.qrTargetUrl),
    nfcTargetUrl: readString(row.nfcTargetUrl),
    frontTemplateUrl: readString(row.frontTemplateUrl),
    centerAssetUrl: readString(row.centerAssetUrl),
    ctaText: readString(row.ctaText),
    proofApprovalSnapshot: readRecord(row.proofApprovalSnapshot),
    proofApprovedAt: readString(row.proofApprovedAt),
    proofPreviewData: readRecord(row.proofPreviewData),
    hasQr: typeof row.hasQr === "boolean" ? row.hasQr : undefined,
    nfcOnly: typeof row.nfcOnly === "boolean" ? row.nfcOnly : undefined,
    priceCents: typeof row.priceCents === "number" && Number.isInteger(row.priceCents) ? row.priceCents : undefined,
    designNotes: readString(row.designNotes),
    proofApproved: row.proofApproved === true,
    manualCollectionAcknowledged: row.manualCollectionAcknowledged === true
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readPurchaseOptionId(value: unknown): PurchaseOptionId | undefined {
  return value === "standard_direct" || value === "branded_qr_direct" || value === "hosted_multilink" ? value : undefined;
}

export function calculateCartTotalCents(items: CartItem[]): number {
  return getCartRows(items).reduce((sum, row) => sum + row.lineSubtotalCents, 0);
}
