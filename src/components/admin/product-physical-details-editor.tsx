"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MigratedProduct } from "@/data/migrated-products";
import { AdminButton, AdminIconButton, AdminInput, AdminSelect } from "./admin-ui";

type Specifications = NonNullable<MigratedProduct["specifications"]>;
type IncludedItems = NonNullable<MigratedProduct["includedItems"]>;

export function ProductPhysicalDetailsEditor({ specifications, includedItems, onSpecificationsChange, onIncludedItemsChange }: {
  specifications: Specifications;
  includedItems: IncludedItems;
  onSpecificationsChange: (items: Specifications) => void;
  onIncludedItemsChange: (items: IncludedItems) => void;
}) {
  return (
    <div className="grid min-w-0 gap-6">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Specifications</h3>
          <AdminButton type="button" disabled={specifications.length >= 40}
            onClick={() => onSpecificationsChange([...specifications, { label: "", value: "" }])}>
            <Plus size={16} aria-hidden="true" /> Add specification
          </AdminButton>
        </div>
        {specifications.length === 0 ? <p className="mt-3 text-sm text-muted">No specifications added.</p> : null}
        <div className="mt-3 grid gap-3">
          {specifications.map((item, index) => (
            <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-3 border-b border-line pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px]">
              <label className="grid min-w-0 gap-2 text-sm font-medium text-ink">
                Specification
                <AdminInput aria-label={`Specification ${index + 1} name`} value={item.label} required pattern=".*\S.*" maxLength={120}
                  onChange={(event) => onSpecificationsChange(specifications.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry))} />
              </label>
              <label className="col-start-1 grid min-w-0 gap-2 text-sm font-medium text-ink sm:col-start-auto">
                Value
                <AdminInput aria-label={`Specification ${index + 1} value`} value={item.value} required pattern=".*\S.*" maxLength={300}
                  onChange={(event) => onSpecificationsChange(specifications.map((entry, i) => i === index ? { ...entry, value: event.target.value } : entry))} />
              </label>
              <AdminIconButton type="button" label={`Remove specification ${index + 1}`} variant="danger" className="col-start-2 row-start-2 h-11 w-11 sm:col-start-auto sm:row-start-auto"
                onClick={() => onSpecificationsChange(specifications.filter((_, i) => i !== index))}>
                <Trash2 size={16} aria-hidden="true" />
              </AdminIconButton>
            </div>
          ))}
        </div>
      </section>
      <section className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">What's included</h3>
          <AdminButton type="button" disabled={includedItems.length >= 40}
            onClick={() => onIncludedItemsChange([...includedItems, { label: "", appliesTo: "all" }])}>
            <Plus size={16} aria-hidden="true" /> Add included item
          </AdminButton>
        </div>
        {includedItems.length === 0 ? <p className="mt-3 text-sm text-muted">No package contents added.</p> : null}
        <div className="mt-3 grid gap-3">
          {includedItems.map((item, index) => (
            <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-3 border-b border-line pb-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_44px]">
              <label className="grid min-w-0 gap-2 text-sm font-medium text-ink">
                Included item
                <AdminInput aria-label={`Included item ${index + 1}`} value={item.label} required pattern=".*\S.*" maxLength={200}
                  onChange={(event) => onIncludedItemsChange(includedItems.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry))} />
              </label>
              <label className="col-start-1 grid min-w-0 gap-2 text-sm font-medium text-ink sm:col-start-auto">
                Included with
                <AdminSelect aria-label={`Included item ${index + 1} applies to`} value={item.appliesTo ?? "all"}
                  onChange={(event) => onIncludedItemsChange(includedItems.map((entry, i) => i === index ? { ...entry, appliesTo: event.target.value as "all" | "branded" } : entry))}>
                  <option value="all">All stands</option>
                  <option value="branded">Branded + QR only</option>
                </AdminSelect>
              </label>
              <AdminIconButton type="button" label={`Remove included item ${index + 1}`} variant="danger" className="col-start-2 row-start-2 h-11 w-11 sm:col-start-auto sm:row-start-auto"
                onClick={() => onIncludedItemsChange(includedItems.filter((_, i) => i !== index))}>
                <Trash2 size={16} aria-hidden="true" />
              </AdminIconButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
