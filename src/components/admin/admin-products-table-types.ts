import type { MigratedProduct } from "@/data/migrated-products";
import type { BusinessUse, PlatformDestination, StandType } from "@/lib/catalog-architecture";
export type AdminProductsTableProps = {
  products: MigratedProduct[];
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  canDelete: boolean;
};
export type DeleteStatus = {
  tone: "success" | "error";
  message: string;
} | null;
export type Filters = {
  search: string;
  standType: string;
  businessUse: string;
  platform: string;
  status: string;
  assetReadiness: string;
  specialSolution: string;
};
