import type { MigratedProduct } from "@/data/migrated-products";
import { type CartItem } from "@/lib/cart";
import { type HostedPageEditorButton } from "@/lib/hosted-page-editor-shared";
import { type OffersSettings } from "@/lib/offers";
import { type PurchaseOptionId } from "@/lib/purchase-options";
import type { ShippingSettingsInput } from "@/lib/validators";
export type ProductSetupChooserProduct = Pick<
  MigratedProduct,
  | "slug"
  | "title"
  | "sku"
  | "shortDescription"
  | "categorySlug"
  | "allowsCustomDesign"
  | "isSpecialSolution"
  | "productKind"
  | "purchaseOptions"
  | "requiresLandingPage"
  | "requiresSubscription"
  | "supportsMultiLink"
  | "primaryPlatformSlug"
  | "destinationType"
  | "displayText"
  | "defaultCtaText"
  | "images"
  | "assetSet"
  | "sizeOptions"
  | "colorOptions"
>;

export type SetupStep = "choose" | "destination" | "links" | "design" | "review" | "confirmation";

export type LinkExperienceId = "direct" | "multilink";

export type MultiLinkDraftButton = Pick<HostedPageEditorButton, "id" | "type" | "label" | "url" | "enabled" | "position">;

export type ProductSetupChooserProps = {
  initialQuantity?: number;
  fixedSelection?: boolean;
  onAdded?: (item: CartItem) => void;
  product: ProductSetupChooserProduct;
  offers?: OffersSettings | null;
  shipping?: ShippingSettingsInput;
  selectedOptionId?: PurchaseOptionId;
  onSelectedOptionChange?: (optionId: PurchaseOptionId) => void;
  onSelectedPriceChange?: (priceCents: number | null) => void;
  onSelectedMonthlyPriceChange?: (priceCents: number) => void;
};
