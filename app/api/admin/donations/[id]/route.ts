import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: donationId } = await ctx.params;

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
  const { data: deleted, error } = await admin
    .from("donation_ledger")
    .delete()
    .eq("id", donationId)
    .select()
    .single();

  if (error || !deleted) {
    return NextResponse.json({ error: error?.message ?? "Could not delete donation entry." }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "donation.delete",
    targetType: "donation_ledger",
    targetId: donationId,
    meta: { period: deleted.period, amount: deleted.amount },
  });

  return NextResponse.json({ ok: true });
}
