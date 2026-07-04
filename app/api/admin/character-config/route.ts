import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";
import { findBannedPhrase, validateHttpUrl } from "@/lib/admin-input-guards";
import type { CharacterConfigRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// character_name is required (non-nullable) and handled separately from the
// other text fields, which are all nullable — blank clears them. URL fields
// are scheme-validated instead of banned-phrase checked (rule #14); the rest
// are free-text copy that could render The Playmaker's voice anywhere in the
// app, so they're checked against the compliance copy gate (rule #1).
const URL_FIELDS = ["avatar_url", "banner_url"] as const;
const COPY_FIELDS = [
  "role",
  "tagline",
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
    const banned = findBannedPhrase(name);
    if (banned) return NextResponse.json({ error: `Copy can't include "${banned}".` }, { status: 400 });
    update.character_name = name;
  }

  for (const field of COPY_FIELDS) {
    if (body[field] !== undefined) {
      const value = String(body[field]).slice(0, MAX_FIELD_LENGTH);
      const banned = findBannedPhrase(value);
      if (banned) return NextResponse.json({ error: `${field} can't include "${banned}".` }, { status: 400 });
      update[field] = value || null;
    }
  }

  for (const field of URL_FIELDS) {
    if (body[field] !== undefined) {
      try {
        update[field] = validateHttpUrl(String(body[field]).slice(0, MAX_FIELD_LENGTH));
      } catch {
        return NextResponse.json({ error: `${field} must be a valid http(s) URL.` }, { status: 400 });
      }
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
