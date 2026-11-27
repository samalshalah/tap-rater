import { findMultiLinkDemo, renderMultiLinkDemoHtml } from "@/lib/multilink-demo";

/** The sample page on its own, for opening on a phone (the demo's QR code points here). */
export function GET(request: Request) {
  const demo = findMultiLinkDemo(new URL(request.url).searchParams.get("type"));
  return new Response(renderMultiLinkDemoHtml(demo), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex"
    }
  });
}
