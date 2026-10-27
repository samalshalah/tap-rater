import { NextResponse } from "next/server";
import { getFooterContent, getHeaderNavigationContent, loadPublicWebsiteContent } from "@/lib/website-content";

export async function GET() {
  const records = await loadPublicWebsiteContent().catch(() => ({}));
  const [header, footer] = await Promise.all([getHeaderNavigationContent(records), getFooterContent(records)]);

  return NextResponse.json({ header, footer });
}
