import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCommissionCsv, matchCommissionRows } from "@/lib/commissions";
import { computeRewardAllocations, writeAuditLog } from "@/lib/rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB

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

  // Re-parse and re-match server-side from the raw CSV rather than trusting
  // any client-echoed "confirmed rows" — this is a financial write.
  const { rows, errors } = parseCommissionCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows to import.", errors }, { status: 400 });
  }
  const matched = await matchCommissionRows(admin, brokerId, rows);

  const { data: importRow, error: importErr } = await admin
    .from("commission_imports")
    .insert({ broker_id: brokerId, period, source: "csv", row_count: matched.length, imported_by: user.id })
    .select()
    .single();
  if (importErr || !importRow) {
    return NextResponse.json({ error: importErr?.message ?? "Could not create import." }, { status: 500 });
  }

  const { data: insertedRows, error: rowsErr } = await admin
    .from("commission_rows")
    .insert(
      matched.map((r) => ({
        import_id: importRow.id,
        broker_id: brokerId,
        uid: r.uid,
        volume: r.volume,
        fees: r.fees,
        backend_commission: r.backend_commission,
        matched_user_id: r.matched_user_id,
        for_period: period,
      })),
    )
    .select("id");
  if (rowsErr || !insertedRows || insertedRows.length !== matched.length) {
    return NextResponse.json({ error: rowsErr?.message ?? "Could not store commission rows." }, { status: 500 });
  }

  // insertedRows[i] corresponds to matched[i]: this is a single INSERT ...
  // VALUES (...), (...) RETURNING id built from `matched.map(...)` above, and
  // Postgres preserves VALUES-list order in RETURNING for a plain multi-row
  // insert (no ORDER BY/trigger reordering involved) — the length check above
  // is a defensive guard against a partial-insert edge case, not evidence
  // this ordering assumption is otherwise unsafe.
  const allocations = matched.flatMap((r, i) =>
    computeRewardAllocations({
      matchedUserId: r.matched_user_id,
      matchedPlanId: r.matched_plan_id,
      fees: r.fees,
      backendCommission: r.backend_commission,
    }).map((a) => ({
      user_id: a.user_id,
      source_type: "commission_row" as const,
      allocation_type: a.allocation_type,
      amount: a.amount,
      status: "pending" as const,
      period,
      commission_row_id: insertedRows[i].id,
    })),
  );

  if (allocations.length > 0) {
    const { error: ledgerErr } = await admin.from("reward_ledger").insert(allocations);
    if (ledgerErr) {
      return NextResponse.json({ error: ledgerErr.message }, { status: 500 });
    }
  }

  await writeAuditLog(admin, {
    actorId: user.id,
    action: "commission.import",
    targetType: "commission_import",
    targetId: importRow.id,
    meta: { broker_id: brokerId, period, row_count: matched.length, allocation_count: allocations.length },
  });

  return NextResponse.json({
    import: importRow,
    row_count: matched.length,
    matched_count: matched.filter((r) => r.match_status === "matched").length,
    allocation_count: allocations.length,
    parse_errors: errors,
  });
}
