import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 200;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, MAX_IDS) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "At least one reward id is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("reward_ledger")
    .update({ status: "paid", paid_at: new Date().toISOString(), paid_by: user.id })
    .in("id", ids)
    .eq("status", "approved")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "reward.mark_paid",
    targetType: "reward_ledger",
    meta: { ids: (updated ?? []).map((r) => r.id) },
  });

  return NextResponse.json({ paid_count: updated?.length ?? 0 });
}
