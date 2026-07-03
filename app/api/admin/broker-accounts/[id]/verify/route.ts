import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BrokerAccountRow, BrokerAccountStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: BrokerAccountStatus[] = [
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "duplicate",
  "inactive",
];

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await ctx.params;

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

  const admin = createAdminClient();
  const update: Partial<BrokerAccountRow> = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as BrokerAccountStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status as BrokerAccountStatus;
    if (update.status === "verified") {
      update.verified_at = new Date().toISOString();
      update.verified_by = user.id;
    }
  }

  if (body.note !== undefined) {
    update.note = String(body.note).slice(0, 500) || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("broker_accounts")
    .update(update)
    .eq("id", accountId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ account: updated });
}
