import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Where a signed-in user should land absent an explicit `redirect` target
 * (e.g. a deep link that expired their session): admins go straight to the
 * admin panel instead of the member dashboard.
 */
export async function resolvePostLoginPath(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"/admin" | "/dashboard"> {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return profile?.role === "admin" ? "/admin" : "/dashboard";
}
