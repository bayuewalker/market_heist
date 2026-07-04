import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralCode } from "@/lib/captain";
import { appUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Get-or-create the caller's own Captain Code. The captain role is
 * admin-assignable only (issue #24) — this is a fallback/manual-refresh
 * path for a captain whose code somehow wasn't auto-created at promotion
 * time; it never promotes a member to captain itself.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "captain") {
    return NextResponse.json(
      { error: "Only captains can generate a referral code. Ask an admin to promote you." },
      { status: 403 },
    );
  }

  const result = await getOrCreateReferralCode(admin, user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ code: result.code, link: appUrl(`/signup?ref=${result.code}`) });
}
