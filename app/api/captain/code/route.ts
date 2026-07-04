import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/captain";
import { appUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

/** Get-or-create the caller's own Captain Code (idempotent). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("captain_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ code: existing.code, link: appUrl(`/signup?ref=${existing.code}`) });
  }

  let code: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !code; attempt++) {
    const candidate = generateReferralCode();
    const { error: insertError } = await admin.from("referral_codes").insert({ code: candidate, captain_id: user.id });
    if (!insertError) {
      code = candidate;
    } else if (!insertError.message.includes("duplicate")) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }
  if (!code) {
    return NextResponse.json({ error: "Could not generate a unique code. Please try again." }, { status: 500 });
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "member") {
    await admin.from("profiles").update({ role: "captain" }).eq("id", user.id);
  }

  return NextResponse.json({ code, link: appUrl(`/signup?ref=${code}`) });
}
