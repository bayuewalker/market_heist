import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";
import type { MissionRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: missionId } = await ctx.params;

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

  const update: Partial<MissionRow> = {};
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
  if (body.points_reward !== undefined) {
    const points = Number(body.points_reward);
    if (!Number.isFinite(points) || points < 0) {
      return NextResponse.json({ error: "Invalid points_reward." }, { status: 400 });
    }
    update.points_reward = Math.round(points);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin.from("missions").update(update).eq("id", missionId).select().single();
  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "mission.update",
    targetType: "mission",
    targetId: missionId,
    meta: update,
  });

  return NextResponse.json({ mission: updated });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: missionId } = await ctx.params;

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
  const { data: deleted, error } = await admin.from("missions").delete().eq("id", missionId).select().maybeSingle();
  if (error) {
    // A foreign-key violation (23503) means members already have user_missions
    // rows against this mission — disabling it (is_active = false) is the
    // right move there, not deleting history out from under them.
    const message =
      error.code === "23503"
        ? "This mission already has member progress against it — disable it instead of deleting."
        : error.message;
    return NextResponse.json({ error: message }, { status: error.code === "23503" ? 409 : 500 });
  }
  if (!deleted) {
    return NextResponse.json({ error: "Mission not found." }, { status: 404 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "mission.delete",
    targetType: "mission",
    targetId: missionId,
    meta: {},
  });

  return NextResponse.json({ ok: true });
}
