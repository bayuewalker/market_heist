import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCommissionCsv, matchCommissionRows } from "@/lib/commissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_ERROR_SAMPLE = 50;

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

  const brokerId = String(body.broker_id ?? "").trim();
  const period = String(body.period ?? "").trim().slice(0, 40);
  const csv = String(body.csv ?? "");

  if (!brokerId || !period) {
    return NextResponse.json({ error: "A broker and period are required." }, { status: 400 });
  }
  if (!csv) {
    return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
  }
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "CSV file is too large (max 2MB)." }, { status: 413 });
  }

  const admin = createAdminClient();
  const { data: broker } = await admin.from("brokers").select("id").eq("id", brokerId).single();
  if (!broker) return NextResponse.json({ error: "Unknown broker." }, { status: 400 });

  const { rows, errors } = parseCommissionCsv(csv);
  const matched = await matchCommissionRows(admin, brokerId, rows);

  const matchedCount = matched.filter((r) => r.match_status === "matched").length;
  const totalBackendCommission = matched.reduce((sum, r) => sum + r.backend_commission, 0);

  return NextResponse.json({
    row_count: rows.length,
    matched_count: matchedCount,
    unmatched_count: rows.length - matchedCount,
    total_backend_commission: totalBackendCommission,
    errors: errors.slice(0, MAX_ERROR_SAMPLE),
    error_count: errors.length,
    unmatched_uids: matched.filter((r) => r.match_status === "unmatched").map((r) => r.uid).slice(0, MAX_ERROR_SAMPLE),
  });
}
