import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/customer-auth";
import { HostedPageEditorError, saveHostedPageDraft } from "@/lib/hosted-page-editor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.response) return auth.response;

  if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Invalid request."},{status:403});
  try {
    const body = await request.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : undefined;
    if(!code||!Number.isInteger(body?.version)||body.version<0||body.version>=2147483647)return NextResponse.json({error:"Refresh the editor before saving."},{status:400});
    const page = await saveHostedPageDraft(auth.session.email, body?.draft, code, body.version);
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    if (error instanceof HostedPageEditorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Draft could not be saved." }, { status: 500 });
  }
}
