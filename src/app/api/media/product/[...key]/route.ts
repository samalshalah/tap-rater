import { NextResponse } from "next/server";
import { getProductMediaObject, ProductMediaStorageError } from "@/lib/admin-media-storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { key: keyParts } = await context.params;
  const key = keyParts.join("/");

  try {
    const object = await getProductMediaObject(key);
    if (!object) {
      return NextResponse.json({ error: "Product media was not found." }, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata?.(headers);
    headers.set("Cache-Control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
    headers.set("Content-Type", object.httpMetadata?.contentType ?? headers.get("Content-Type") ?? "application/octet-stream");

    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Product media could not be loaded." }, { status: 500 });
  }
}
