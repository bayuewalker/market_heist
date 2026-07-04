import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";
import { MISSION_TRIGGER_TYPES } from "@/lib/missions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MISSION_KEY_PATTERN = /^[a-z0-9_]+$/;

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

  const missionKey = String(body.mission_key ?? "").trim().toLowerCase();
  const publicName = String(body.public_name ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;
  const triggerType = String(body.trigger_type ?? "").trim().toLowerCase();
  const points = Number(body.points_reward);

  if (!MISSION_KEY_PATTERN.test(missionKey)) {
    return NextResponse.json({ error: "mission_key must be lowercase letters, numbers, and underscores only." }, { status: 400 });
  }
  if (!publicName) {
    return NextResponse.json({ error: "public_name is required." }, { status: 400 });
  }
  if (!MISSION_TRIGGER_TYPES.includes(triggerType as (typeof MISSION_TRIGGER_TYPES)[number])) {
    return NextResponse.json(
      { error: `trigger_type must be one of: ${MISSION_TRIGGER_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(points) || points < 0) {
    return NextResponse.json({ error: "Invalid points_reward." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("missions")
    .insert({
      mission_key: missionKey,
      public_name: publicName,
      description,
      points_reward: Math.round(points),
      trigger_type: triggerType,
    })
    .select()
    .single();

  if (error || !created) {
    const message = error?.code === "23505" ? "A mission with that key already exists." : error?.message ?? "Create failed.";
    return NextResponse.json({ error: message }, { status: error?.code === "23505" ? 409 : 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "mission.create",
    targetType: "mission",
    targetId: created.id,
    meta: { mission_key: missionKey, public_name: publicName, trigger_type: triggerType, points_reward: created.points_reward },
  });

  return NextResponse.json({ mission: created }, { status: 201 });
}
