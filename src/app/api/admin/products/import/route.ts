import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { applyProductCsvImport, validateProductCsvImport } from "@/lib/admin-product-csv";
import { hasSupabaseAdminConfig } from "@/lib/db";

const MAX_CSV_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database persistence is not configured. Product import requires backend product data." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const mode = form?.get("mode");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }
  if (mode !== "validate" && mode !== "apply") {
    return NextResponse.json({ error: "Import mode must be validate or apply." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "CSV file is larger than 10 MB." }, { status: 413 });
  }

  const csvText = await file.text();
  const result = mode === "validate" ? await validateProductCsvImport(csvText) : await applyProductCsvImport(csvText);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
