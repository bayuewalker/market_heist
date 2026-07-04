import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const email = String(body.email ?? "").trim().toLowerCase();
  const pointsDelta = Number(body.points_delta);
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!email) return NextResponse.json({ error: "A member email is required." }, { status: 400 });
  if (!Number.isFinite(pointsDelta) || pointsDelta === 0) {
    return NextResponse.json({ error: "A non-zero points_delta is required." }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: "A reason is required for manual point adjustments." }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ error: "No member found with that email." }, { status: 404 });

  const roundedDelta = Math.round(pointsDelta);

  const { data: row, error } = await admin.rpc("append_heist_points", {
    p_user_id: profile.id,
    p_source_type: "manual_adjustment",
    p_source_id: null,
    p_points_delta: roundedDelta,
    p_reason: reason,
  });
  if (error) {
    const status = error.message.includes("below zero") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "points.manual_adjustment",
    targetType: "heist_points_ledger",
    targetId: row.id,
    meta: { points_delta: roundedDelta, reason, balance_after: row.balance_after },
  });

  return NextResponse.json({ balance_after: row.balance_after });
}
