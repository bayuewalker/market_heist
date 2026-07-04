import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: eligible } = await admin
    .from("genesis_eligibility")
    .select("user_id, reservation_id, eligible_at")
    .eq("campaign_key", "genesis")
    .eq("is_eligible", true)
    .order("eligible_at", { ascending: true });

  const userIds = (eligible ?? []).map((e) => e.user_id);
  const { data: profiles } =
    userIds.length > 0 ? await admin.from("profiles").select("id, email, full_name").in("id", userIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows = (eligible ?? []).map((e) => {
    const profile = profileById.get(e.user_id);
    return [e.reservation_id ?? "", profile?.email ?? "", profile?.full_name ?? "", e.eligible_at ?? ""];
  });

  const csv = [
    ["reservation_id", "email", "full_name", "eligible_at"].join(","),
    ...rows.map((r) => r.map((v) => csvEscape(String(v))).join(",")),
  ].join("\n");

  if (eligible && eligible.length > 0) {
    const now = new Date().toISOString();
    await admin
      .from("genesis_eligibility")
      .update({ exported_at: now })
      .eq("campaign_key", "genesis")
      .eq("is_eligible", true);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="genesis-eligibility.csv"`,
    },
  });
}
