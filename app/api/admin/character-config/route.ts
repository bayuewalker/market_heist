import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";
import type { CharacterConfigRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// character_name is required (non-nullable) and handled separately from the
// other text fields, which are all nullable — blank clears them.
const NULLABLE_TEXT_FIELDS = [
  "role",
  "tagline",
  "avatar_url",
  "banner_url",
  "bot_intro_message",
  "signal_prefix",
  "dashboard_note_title",
  "dashboard_note_body",
] as const;
const MAX_FIELD_LENGTH = 2000;

export async function PATCH(request: Request) {
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

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "A character config id is required." }, { status: 400 });
  }

  const update: Partial<CharacterConfigRow> = {};

  if (body.character_name !== undefined) {
    const name = String(body.character_name).slice(0, MAX_FIELD_LENGTH).trim();
    if (!name) return NextResponse.json({ error: "character_name cannot be empty." }, { status: 400 });
    update.character_name = name;
  }

  for (const field of NULLABLE_TEXT_FIELDS) {
    if (body[field] !== undefined) {
      const value = String(body[field]).slice(0, MAX_FIELD_LENGTH);
      update[field] = value || null;
    }
  }
  if (body.is_active !== undefined) {
    update.is_active = Boolean(body.is_active);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("character_configs")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "character_config.update",
    targetType: "character_config",
    targetId: id,
    meta: update,
  });

  return NextResponse.json({ character_config: updated });
}
