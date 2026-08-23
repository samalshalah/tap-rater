import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { ProductMediaStorageError, uploadProductMedia } from "@/lib/admin-media-storage";

export const dynamic = "force-dynamic";

const maxLogoUploadRequestBytes = 11 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxLogoUploadRequestBytes) {
      return NextResponse.json({ error: "Your logo must be 10 MB or smaller." }, { status: 413 });
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a logo image to upload." }, { status: 400 });
    }

    const asset = await uploadProductMedia({
      file,
      productSlug: `hosted-page-${auth.session.email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      role: "center_asset"
    });

    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Your logo could not be uploaded. Please try again." }, { status: 500 });
  }
}

