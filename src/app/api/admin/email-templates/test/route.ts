import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { sendMultiLinkOrderEmailTest } from "@/lib/order-email-test";
import {
  emailTemplateTestSendSchema,
  getEmailTemplate,
  sendEmailTemplateTest
} from "@/lib/email-templates";

const testRequestSchema = emailTemplateTestSendSchema.extend({
  scenario: z.literal("hosted_multilink").optional()
}).refine(value => !value.scenario || value.key === "customer-order-confirmation");

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = testRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid test recipient." }, { status: 400 });
  }

  const recipient = parsed.data.to ?? process.env.ADMIN_EMAIL;
  if (!recipient) {
    return NextResponse.json({ error: "No admin or test recipient email is configured." }, { status: 400 });
  }

  const template = await getEmailTemplate(parsed.data.key);
  const result = parsed.data.scenario === "hosted_multilink"
    ? await sendMultiLinkOrderEmailTest({ template, to: recipient })
    : await sendEmailTemplateTest({ template, to: recipient });

  if (!result.sent) {
    return NextResponse.json({ error: `Test email was not sent: ${result.reason}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
