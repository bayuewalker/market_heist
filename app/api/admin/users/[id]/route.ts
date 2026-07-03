import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow, UserRole } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["member", "admin"];

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await ctx.params;

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

  const update: Partial<ProfileRow> = {};

  if (body.plan_id !== undefined) {
    const admin = createAdminClient();
    const { data: plan } = await admin.from("plans").select("id").eq("id", String(body.plan_id)).single();
    if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    update.plan_id = plan.id;
  }

  if (body.role !== undefined) {
    if (targetId === user.id) {
      return NextResponse.json({ error: "You can't change your own admin role." }, { status: 400 });
    }
    if (!ROLES.includes(body.role as UserRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    update.role = body.role as UserRole;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", targetId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
