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
    try {
      object.writeHttpMetadata?.(headers);
    } catch {
      // Local OpenNext/Next dev shims can reject Headers across the RPC boundary.
    }
    headers.set("Cache-Control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");
    headers.set("Content-Type", object.httpMetadata?.contentType ?? headers.get("Content-Type") ?? "application/octet-stream");
    const body = object.body ?? (await object.arrayBuffer?.());

    if (!body) {
      return NextResponse.json({ error: "Product media was not found." }, { status: 404 });
    }

    return new Response(body, { headers });
  } catch (error) {
    if (error instanceof ProductMediaStorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("Product media could not be loaded.", error);
    }

    return NextResponse.json({ error: "Product media could not be loaded." }, { status: 500 });
  }
}
