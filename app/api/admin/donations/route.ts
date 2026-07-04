import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 500;

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

  const period = String(body.period ?? "").trim().slice(0, 40);
  const description = String(body.description ?? "").trim().slice(0, MAX_TEXT_LENGTH);
  const amount = Number(body.amount);
  const proofUrl = body.proof_url ? String(body.proof_url).trim().slice(0, MAX_TEXT_LENGTH) : null;

  if (!period || !description) {
    return NextResponse.json({ error: "A period and description are required." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("donation_ledger")
    .insert({ period, description, amount, proof_url: proofUrl, created_by: user.id })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Could not create donation entry." }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "donation.create",
    targetType: "donation_ledger",
    targetId: inserted.id,
    meta: { period, amount },
  });

  return NextResponse.json({ donation: inserted });
}
