import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";
import type { SignalStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: SignalStatus[] = [
  "pending",
  "active",
  "hit_tp1",
  "hit_tp2",
  "hit_tp3",
  "invalidated",
  "expired",
  "manual_closed",
];

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: signalId } = await ctx.params;

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

  const status = String(body.status ?? "") as SignalStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const note = String(body.note ?? "").slice(0, 500);

  const admin = createAdminClient();
  const { data: updated, error } = await admin.rpc("record_signal_status_change", {
    p_signal_id: signalId,
    p_status: status,
    p_update_text: note || `Marked "${status}" by an admin.`,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "signal.status_update",
    targetType: "signal",
    targetId: signalId,
    meta: { status, note },
  });

  return NextResponse.json({ signal: updated });
}
