import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPointsBalance } from "@/lib/missions";
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

  const currentBalance = await getPointsBalance(admin, profile.id);
  const balanceAfter = currentBalance + Math.round(pointsDelta);
  if (balanceAfter < 0) {
    return NextResponse.json({ error: "Adjustment would bring the balance below zero." }, { status: 400 });
  }

  const { error } = await admin.from("heist_points_ledger").insert({
    user_id: profile.id,
    source_type: "manual_adjustment",
    points_delta: Math.round(pointsDelta),
    balance_after: balanceAfter,
    reason,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "points.manual_adjustment",
    targetType: "heist_points_ledger",
    targetId: profile.id,
    meta: { points_delta: pointsDelta, reason, balance_after: balanceAfter },
  });

  return NextResponse.json({ balance_after: balanceAfter });
}
