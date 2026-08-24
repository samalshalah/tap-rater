import { NextResponse } from "next/server";
import { getFooterContent, getHeaderNavigationContent } from "@/lib/website-content";

export async function GET() {
  const [header, footer] = await Promise.all([getHeaderNavigationContent(), getFooterContent()]);

  return NextResponse.json({ header, footer });
}
