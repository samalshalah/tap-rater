import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getMediaBackupState, runMediaBackupBatch, runMediaRecoveryDrill, restoreMediaToStaging } from "@/lib/media-recovery";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { env } = await getCloudflareContext({ async: true });
    return NextResponse.json({
      customerSecretSeparated: Boolean(process.env.CUSTOMER_SESSION_SECRET && process.env.CUSTOMER_SESSION_SECRET !== process.env.ADMIN_SESSION_SECRET),
      databaseHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : null,
      stripeMode: process.env.STRIPE_MODE,
      media: await getMediaBackupState(env.RECOVERY_BACKUPS)
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Recovery storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  if (!body || !["backup", "drill", "restore"].includes(body.action) ||
    (body.action === "restore" && (typeof body.backupKey !== "string" || body.backupKey.length > 1024))) {
    return NextResponse.json({ error: "Invalid recovery action." }, { status: 400 });
  }
  try {
    const { env } = await getCloudflareContext({ async: true });
    const result = body.action === "backup"
      ? await runMediaBackupBatch(env.PRODUCT_MEDIA_BUCKET, env.RECOVERY_BACKUPS)
      : body.action === "drill"
        ? await runMediaRecoveryDrill(env.PRODUCT_MEDIA_BUCKET, env.RECOVERY_BACKUPS)
        : await restoreMediaToStaging(env.PRODUCT_MEDIA_BUCKET, env.RECOVERY_BACKUPS, body.backupKey);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Recovery action failed. No existing customer media was overwritten." }, { status: 503 });
  }
}
