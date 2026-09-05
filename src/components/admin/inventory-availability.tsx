"use client";

import { PackageCheck, PackageX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminLinkButton,
  AdminSummaryCard
} from "@/components/admin/admin-ui";

type InventoryRow = {
  slug: string;
  title: string;
  sku: string;
  category: string;
  stockStatus: "instock" | "outofstock";
};

export function InventoryAvailability({ initialRows }: { initialRows: InventoryRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const availableCount = rows.filter((row) => row.stockStatus === "instock").length;

  async function changeAvailability(row: InventoryRow) {
    const stockStatus = row.stockStatus === "instock" ? "outofstock" : "instock";
    setSavingSlug(row.slug);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(row.slug)}/inventory`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stockStatus })
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Inventory availability could not be saved.");

      setRows((current) => current.map((candidate) => candidate.slug === row.slug ? { ...candidate, stockStatus } : candidate));
      setMessage(`${row.title} is now ${stockStatus === "instock" ? "available" : "out of stock"}.`);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Inventory availability could not be saved.");
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div className="mt-8 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminSummaryCard label="Active products" value={String(rows.length)} />
        <AdminSummaryCard label="Available" value={String(availableCount)} />
        <AdminSummaryCard label="Out of stock" value={String(rows.length - availableCount)} />
      </div>

      {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
      {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}

      <AdminCard title="Product availability" description="Availability is binary because stands are produced to order. Out-of-stock products are rejected by checkout immediately." className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-muted">
                <th className="pb-3 pr-4 font-semibold">Product</th>
                <th className="pb-3 pr-4 font-semibold">SKU</th>
                <th className="pb-3 pr-4 font-semibold">Category</th>
                <th className="pb-3 pr-4 font-semibold">Availability</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => {
                const isAvailable = row.stockStatus === "instock";
                return (
                  <tr key={row.slug}>
                    <td className="py-3 pr-4 font-medium text-ink">{row.title}</td>
                    <td className="py-3 pr-4 text-muted">{row.sku}</td>
                    <td className="py-3 pr-4 capitalize text-muted">{row.category.replaceAll("-", " ")}</td>
                    <td className="py-3 pr-4">
                      <AdminBadge tone={isAvailable ? "success" : "danger"}>{isAvailable ? "In stock" : "Out of stock"}</AdminBadge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <AdminButton
                          type="button"
                          variant="outline"
                          className="min-h-9 px-3 py-1.5 text-xs"
                          disabled={Boolean(savingSlug)}
                          loading={savingSlug === row.slug}
                          onClick={() => changeAvailability(row)}
                        >
                          {isAvailable ? <PackageX className="h-4 w-4" aria-hidden="true" /> : <PackageCheck className="h-4 w-4" aria-hidden="true" />}
                          {isAvailable ? "Mark out of stock" : "Mark in stock"}
                        </AdminButton>
                        <AdminLinkButton href={`/admin/products/${row.slug}`} variant="ghost">Edit</AdminLinkButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
