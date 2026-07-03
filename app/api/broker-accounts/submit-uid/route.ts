import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const brokerId = String(body.broker_id ?? "").trim();
  const uid = String(body.uid ?? "").trim().slice(0, 100);
  if (!brokerId || !uid) {
    return NextResponse.json({ error: "A broker and UID are required." }, { status: 400 });
  }

  const { data: broker } = await supabase.from("brokers").select("id").eq("id", brokerId).single();
  if (!broker) {
    return NextResponse.json({ error: "Unknown broker." }, { status: 400 });
  }

  const { data: upserted, error } = await supabase
    .from("broker_accounts")
    .upsert(
      { user_id: user.id, broker_id: brokerId, uid, status: "submitted" },
      { onConflict: "user_id,broker_id" },
    )
    .select()
    .single();

  if (error || !upserted) {
    // The guard trigger raises a plain exception once a row is locked
    // (under_review/verified/duplicate/inactive) — surface that message as-is.
    return NextResponse.json({ error: error?.message ?? "Submission failed." }, { status: 409 });
  }

  return NextResponse.json({ account: upserted });
}
