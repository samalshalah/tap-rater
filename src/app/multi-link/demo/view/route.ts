import { findMultiLinkDemo, readMultiLinkDemoFocus, renderMultiLinkDemoHtml } from "@/lib/multilink-demo";

/** The sample page on its own, for opening on a phone (the demo's QR code points here). */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const demo = findMultiLinkDemo(params.get("type"));
  return new Response(renderMultiLinkDemoHtml(demo, readMultiLinkDemoFocus(params.get("focus"))), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex"
    }
  });
}
