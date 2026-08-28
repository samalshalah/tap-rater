import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { buildProductCsvTemplate, exportAdminProductsCsv } from "@/lib/admin-product-csv";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const csv = url.searchParams.get("template") === "1" ? buildProductCsvTemplate() : await exportAdminProductsCsv();
    const today = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tap-rater-products-${today}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Products could not be exported." },
      { status: 500 }
    );
  }
}
