export function GET() {
  return new Response(
    "<!doctype html><html><head><title>Multi-Link unavailable</title><meta name=\"robots\" content=\"noindex,nofollow\"></head><body><h1>Multi-Link is unavailable</h1><p>Hosted Multi-Link purchasing is not available right now.</p></body></html>",
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Tap-Rater-Multi-Link-State": "inactive"
      }
    }
  );
}
