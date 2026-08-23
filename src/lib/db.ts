import { createClient } from "@supabase/supabase-js";
import { createNeonSupabaseAdapterFromUrl, getDatabaseUrlFromEnv } from "@/lib/neon-supabase-adapter";
import { createLocalQaOrdersAdapter, getLocalQaOrdersFileFromEnv } from "@/lib/local-qa-persistence";

export function hasSupabaseAdminConfig() {
  return Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) || getDatabaseUrlFromEnv() || getLocalQaOrdersFileFromEnv());
}

export function getSupabaseAdmin(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = getDatabaseUrlFromEnv();
  const localQaOrdersFile = getLocalQaOrdersFileFromEnv();

  if (url && serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });
  }

  if (databaseUrl) {
    return createNeonSupabaseAdapterFromUrl(databaseUrl);
  }

  if (localQaOrdersFile) {
    return createLocalQaOrdersAdapter(localQaOrdersFile);
  }

  throw new Error("Database server credentials are not configured.");
}
