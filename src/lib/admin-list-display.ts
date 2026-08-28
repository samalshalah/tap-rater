export const adminProductListFilterLabels = [
  "Search",
  "Stand Type",
  "Business Use",
  "Platform",
  "Status",
  "Asset readiness",
  "Special solution"
] as const;

export const adminProductListColumnLabels = [
  "Image",
  "Product",
  "Type",
  "Uses",
  "Options",
  "Price",
  "Readiness",
  "Status",
  "Updated",
  "Actions"
] as const;

type OrderSummaryItem = {
  title?: string;
  quantity: number;
};

export function formatOrderItemSummary(items: OrderSummaryItem[]) {
  if (items.length === 0) {
    return { title: "No items", count: "0 items" };
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const primaryTitle = items[0]?.title ?? "Untitled item";
  const extraProductCount = Math.max(items.length - 1, 0);

  return {
    title: extraProductCount > 0 ? `${primaryTitle} + ${extraProductCount} more` : primaryTitle,
    count: `${totalQuantity} item${totalQuantity === 1 ? "" : "s"}`
  };
}
