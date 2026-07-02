import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-only Supabase client using the service-role key. Bypasses RLS — use
 * ONLY in trusted server code (payment confirmation, cron). Never import into
 * a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Supabase admin client is not configured (NEXT_PUBLIC_SUPABASE_URL missing).");
  if (!serviceKey) {
    throw new Error("Supabase admin client is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
