import type { MigratedProduct,ProductKind } from "@/data/migrated-products";
import type {
BusinessUse,
PlatformDestination,
ProductOption,
ProductOptionCode,
StandType
} from "@/lib/catalog-architecture";
export type ProductEditorProps = {
  product: MigratedProduct;
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  optionTemplates: ProductOption[];
  productOptions: ProductOption[];
  mode: "create" | "edit";
};

export type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

export type AssetKey =
  | "standardAngledImageUrl"
  | "brandedAngledImageUrl"
  | "standardFrontTemplateUrl"
  | "brandedFrontTemplateUrl";

export type AssetSetState = Record<AssetKey, string>;

export type MediaItemState = {
  src: string;
  alt: string;
};

export type MediaUploadRole =
  | "main"
  | "gallery"
  | "standard_angled"
  | "standard_front"
  | "branded_angled"
  | "branded_front_template";

export const normalOptionCodes: ProductOptionCode[] = ["branded_qr_direct"];
export type OperationalProductKind = Exclude<ProductKind, "hosted_multilink">;

