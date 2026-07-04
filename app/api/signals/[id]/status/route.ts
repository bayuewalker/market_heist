import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignalStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Members may only self-track outcomes on a live signal — never reopen a
// terminal one or jump straight to "pending" (that's the initial/admin-only
// state).
const MEMBER_ALLOWED_STATUSES: SignalStatus[] = ["hit_tp1", "hit_tp2", "hit_tp3", "invalidated", "manual_closed"];

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: signalId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: signal } = await supabase.from("signals").select("id, user_id").eq("id", signalId).maybeSingle();
  if (!signal || signal.user_id !== user.id) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = String(body.status ?? "") as SignalStatus;
  if (!MEMBER_ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const label = String(body.label ?? status).slice(0, 60);

  const admin = createAdminClient();
  const { data: updated, error } = await admin.rpc("record_signal_status_change", {
    p_signal_id: signalId,
    p_status: status,
    p_update_text: `Marked "${label}" by the member.`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signal: updated });
}
