import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  emailTemplateTestSendSchema,
  getEmailTemplate,
  sendEmailTemplateTest
} from "@/lib/email-templates";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = emailTemplateTestSendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid test recipient." }, { status: 400 });
  }

  const recipient = parsed.data.to ?? process.env.ADMIN_EMAIL;
  if (!recipient) {
    return NextResponse.json({ error: "No admin or test recipient email is configured." }, { status: 400 });
  }

  const template = await getEmailTemplate(parsed.data.key);
  const result = await sendEmailTemplateTest({ template, to: recipient });

  if (!result.sent) {
    return NextResponse.json({ error: `Test email was not sent: ${result.reason}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
