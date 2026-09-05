import { NextResponse } from "next/server";
import { ProductMediaStorageError, uploadProductMedia } from "@/lib/admin-media-storage";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";

export const dynamic = "force-dynamic";

const maxSetupLogoUploadRequestBytes = 11 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimit = await checkPublicRateLimit(request, "setup-logo", "PUBLIC_FORM_RATE_LIMITER");
    if (rateLimit.limited) return rateLimitResponse();

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxSetupLogoUploadRequestBytes) {
      return NextResponse.json({ error: "Logo image must be 10 MB or smaller." }, { status: 413 });
    }

    const form = await request.formData().catch(() => null);

    if (!form) {
      return NextResponse.json({ error: "Choose a logo image to upload." }, { status: 400 });
    }

    const file = form.get("file");
    const productSlug = String(form.get("productSlug") ?? "logo").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a logo image to upload." }, { status: 400 });
    }

    const asset = await uploadProductMedia({
      file,
      productSlug: `customer-setup-${productSlug || "logo"}`,
      role: "center_asset"
    });

    return NextResponse.json({
      ok: true,
      asset: {
        mediaUrl: asset.url,
        storageKey: asset.storageKey,
        filename: asset.filename,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height
      }
    });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Logo upload failed." }, { status: 500 });
  }
}
