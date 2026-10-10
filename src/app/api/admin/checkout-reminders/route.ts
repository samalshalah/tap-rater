import { requireAdminApi } from "@/lib/admin-auth";
import { getReminderSettings, saveReminderSettings } from "@/lib/checkout-reminders";
import { reminderSettingsSchema } from "@/lib/checkout-reminder-model";
export async function GET() {
  const unauthorized = await requireAdminApi(); if (unauthorized) return unauthorized;
  return Response.json(await getReminderSettings());
}
export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(); if (unauthorized) return unauthorized;
  const parsed = reminderSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose increasing reminder times between 1 and 168 hours." }, { status: 400 });
  await saveReminderSettings(parsed.data);
  return Response.json({ ok: true });
}
