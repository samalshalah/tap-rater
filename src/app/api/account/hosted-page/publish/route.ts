import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { HostedPageEditorError, publishHostedPageDraft } from "@/lib/hosted-page-editor";
import { HostedPageRepositoryError } from "@/lib/hosted-pages/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  const storage = await getHostedPageStorage();
  if (!storage) {
    return NextResponse.json({ error: "Publishing storage is not configured. Your current live page is still available." }, { status: 503 });
  }

  try {
    const result = await publishHostedPageDraft(auth.session.email, storage);
    return NextResponse.json({
      ok: true,
      page: result.page,
      published: {
        version: result.snapshot.version,
        publishedAt: result.snapshot.publishedAt,
        permanentUrl: `https://taprater.com/p/${result.snapshot.code}`
      }
    });
  } catch (error) {
    console.error("Hosted page publish failed", error);
    if (error instanceof HostedPageEditorError || error instanceof HostedPageRepositoryError) {
      return NextResponse.json(
        { error: "We couldn't publish your changes. Your current live page is still available. Try again." },
        { status: error instanceof HostedPageEditorError ? error.status : 500 }
      );
    }

    return NextResponse.json({ error: "We couldn't publish your changes. Your current live page is still available. Try again." }, { status: 500 });
  }
}
