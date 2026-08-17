import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { ProductMediaStorageError, uploadProductMedia, type ProductMediaRole } from "@/lib/admin-media-storage";

export const dynamic = "force-dynamic";

const productMediaRoles = new Set<ProductMediaRole>([
  "main",
  "gallery",
  "standard_angled",
  "standard_front",
  "branded_angled",
  "branded_front_template",
  "multilink_angled",
  "multilink_front_template",
  "center_asset"
]);

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const role = String(form.get("role") ?? "");
    const productSlug = String(form.get("productSlug") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    }

    if (!productMediaRoles.has(role as ProductMediaRole)) {
      return NextResponse.json({ error: "Unsupported product media role." }, { status: 400 });
    }

    const asset = await uploadProductMedia({ file, productSlug, role: role as ProductMediaRole });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Product media upload failed." }, { status: 500 });
  }
}
