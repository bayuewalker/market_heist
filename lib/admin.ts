import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard for admin routes/actions. Redirects non-admins to the
 * dashboard. Relies on the `role` column + RLS (`is_admin()`), so this is a
 * UX-level gate — RLS is the actual security boundary for data access.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return { supabase, user };
}
