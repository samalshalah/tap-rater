"use client";
import type { MigratedProduct, ProductStatus } from "@/data/migrated-products";
import type { BusinessUse, PlatformDestination, StandType } from "@/lib/catalog-architecture";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import type { Filters } from "./admin-products-table-types";
import {
  AdminBadge,
  AdminInput,
  AdminSelect
} from "./admin-ui";
export function ProductFilters({
  filters,
  standTypes,
  businessUses,
  platforms,
  onChange
}: {
  filters: Filters;
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}) {
  return (
    <>
      <label className="relative block text-xs font-black uppercase text-muted">
        Search
        <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted" aria-hidden="true" />
        <AdminInput
          className="mt-2 py-2.5 pl-9 pr-3 font-normal"
          value={filters.search}
          placeholder="Name, SKU, slug"
          onChange={(event) => onChange("search", event.target.value)}
        />
      </label>
      <FilterSelect label="Stand Type" value={filters.standType} onChange={(value) => onChange("standType", value)}>
        {standTypes.map((standType) => (
          <option key={standType.slug} value={standType.slug}>
            {standType.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Business Use" value={filters.businessUse} onChange={(value) => onChange("businessUse", value)}>
        {businessUses.map((businessUse) => (
          <option key={businessUse.slug} value={businessUse.slug}>
            {businessUse.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Platform" value={filters.platform} onChange={(value) => onChange("platform", value)}>
        {platforms.map((platform) => (
          <option key={platform.slug} value={platform.slug}>
            {platform.title}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Status" value={filters.status} onChange={(value) => onChange("status", value)}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </FilterSelect>
      <FilterSelect label="Asset readiness" value={filters.assetReadiness} onChange={(value) => onChange("assetReadiness", value)}>
        <option value="ready">Ready</option>
        <option value="draft_missing_assets">Missing</option>
        <option value="blocked">Blocked</option>
      </FilterSelect>
      <FilterSelect label="Special solution" value={filters.specialSolution} onChange={(value) => onChange("specialSolution", value)}>
        <option value="yes">Special solution</option>
        <option value="no">Normal product</option>
      </FilterSelect>
    </>
  );
}

export function FilterSelect({
  label,
  value,
  children,
  onChange
}: {
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.04em] text-muted">
      {label}
      <AdminSelect
        className="mt-2 px-3 py-2.5 font-normal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {children}
      </AdminSelect>
    </label>
  );
}

export function ProductThumbnail({ product }: { product: MigratedProduct }) {
  const image = product.images[0]?.src ?? product.assetSet?.standardAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl;

  return image ? (
    <img src={image} alt={product.images[0]?.alt || product.title} className="h-16 w-16 rounded-lg border border-line bg-white object-contain" loading="lazy" />
  ) : (
    <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-line bg-white text-[10px] font-bold uppercase text-muted">
      No image
    </div>
  );
}

export function ProductStatusControl({
  status,
  disabled,
  onChange
}: {
  status: ProductStatus;
  disabled: boolean;
  onChange: (status: ProductStatus) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.04em] text-muted">
      Status
      <AdminSelect
        className="h-9 min-h-9 w-28 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.04em]"
        value={status}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ProductStatus)}
      >
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </AdminSelect>
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "DIRECT" || status === "STANDARD"
      ? "success"
      : status === "archived" || status === "HOSTED"
        ? "neutral"
        : "warning";

  return <AdminBadge tone={tone}>{status}</AdminBadge>;
}

export function ReadinessYesNoBadge({ ready }: { ready: boolean }) {
  return <AdminBadge tone={ready ? "success" : "warning"}>{ready ? "Yes" : "No"}</AdminBadge>;
}

export function ProductMobileField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-muted"}>{value}</dd>
    </div>
  );
}
