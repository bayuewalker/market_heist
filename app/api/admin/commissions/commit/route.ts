import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCommissionCsv, matchCommissionRows } from "@/lib/commissions";
import { computeRewardAllocations, writeAuditLog } from "@/lib/rewards";
import { getCaptainTier } from "@/lib/captain";

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

  // Batch-resolve which matched members were referred by a captain, so the
  // per-row allocation split below can credit that captain's reward bucket
  // (M11) without an N+1 query.
  const matchedUserIds = [...new Set(matched.map((r) => r.matched_user_id).filter((id): id is string => !!id))];
  const { data: captainLinks } =
    matchedUserIds.length > 0
      ? await admin.from("captain_networks").select("member_id, captain_id").in("member_id", matchedUserIds)
      : { data: [] };
  const captainByMember = new Map((captainLinks ?? []).map((c) => [c.member_id, c.captain_id]));

  // Each captain's reward rate depends on their CURRENT tier, which counts
  // only VERIFIED referred members (§23's Captain Network Roadmap table) —
  // batch-resolve every referenced captain's full branch, not just the
  // members matched in this import.
  const captainIds = [...new Set([...captainByMember.values()].filter((id): id is string => !!id))];
  const { data: allCaptainLinks } =
    captainIds.length > 0
      ? await admin.from("captain_networks").select("captain_id, member_id").in("captain_id", captainIds)
      : { data: [] };
  const branchMemberIds = [...new Set((allCaptainLinks ?? []).map((r) => r.member_id))];
  const { data: verifiedBranchRows } =
    branchMemberIds.length > 0
      ? await admin.from("broker_accounts").select("user_id").in("user_id", branchMemberIds).eq("status", "verified")
      : { data: [] };
  const verifiedBranchMemberIds = new Set((verifiedBranchRows ?? []).map((r) => r.user_id));
  const verifiedReferredCountByCaptain = new Map<string, number>();
  for (const row of allCaptainLinks ?? []) {
    if (!verifiedBranchMemberIds.has(row.member_id)) continue;
    verifiedReferredCountByCaptain.set(row.captain_id, (verifiedReferredCountByCaptain.get(row.captain_id) ?? 0) + 1);
  }

  // insertedRows[i] corresponds to matched[i]: this is a single INSERT ...
  // VALUES (...), (...) RETURNING id built from `matched.map(...)` above, and
  // Postgres preserves VALUES-list order in RETURNING for a plain multi-row
  // insert (no ORDER BY/trigger reordering involved) — the length check above
  // is a defensive guard against a partial-insert edge case, not evidence
  // this ordering assumption is otherwise unsafe.
  const allocations = matched.flatMap((r, i) => {
    const captainId = r.matched_user_id ? captainByMember.get(r.matched_user_id) ?? null : null;
    const captainTier = captainId ? getCaptainTier(verifiedReferredCountByCaptain.get(captainId) ?? 0) : null;
    return computeRewardAllocations({
      matchedUserId: r.matched_user_id,
      matchedPlanId: r.matched_plan_id,
      fees: r.fees,
      backendCommission: r.backend_commission,
      captainId,
      captainRewardRate: captainTier?.rewardRate ?? null,
    }).map((a) => ({
      user_id: a.user_id,
      source_type: "commission_row" as const,
      allocation_type: a.allocation_type,
      amount: a.amount,
      status: "pending" as const,
      period,
      commission_row_id: insertedRows[i].id,
    }));
  });

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
