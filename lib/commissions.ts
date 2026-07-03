import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Minimal CSV parsing for broker commission imports. Expected header (any
 * order, case-insensitive): uid, volume, fees, backend_commission. `broker`
 * and `period` are supplied once per import (a CSV batch is always one
 * broker + one period), not per row.
 */

export type ParsedCommissionRow = {
  line: number;
  uid: string;
  volume: number | null;
  fees: number | null;
  backend_commission: number;
};

export type CommissionRowError = {
  line: number;
  reason: string;
};

export type ParsedCommissionCsv = {
  rows: ParsedCommissionRow[];
  errors: CommissionRowError[];
};

const REQUIRED_COLUMNS = ["uid", "backend_commission"] as const;

// Splits a single CSV line on commas, respecting double-quoted fields (which
// may themselves contain commas or escaped "" quotes).
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field.trim());
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  return fields;
}

function toNumberOrNull(value: string): number | null {
  if (value === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseCommissionCsv(csvText: string): ParsedCommissionCsv {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, reason: "Empty file." }] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 1, reason: `Missing required column(s): ${missing.join(", ")}.` }] };
  }

  const uidIdx = header.indexOf("uid");
  const volumeIdx = header.indexOf("volume");
  const feesIdx = header.indexOf("fees");
  const backendIdx = header.indexOf("backend_commission");

  const rows: ParsedCommissionRow[] = [];
  const errors: CommissionRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const fields = splitCsvLine(lines[i]);

    const uid = (fields[uidIdx] ?? "").trim().slice(0, 100);
    if (!uid) {
      errors.push({ line: lineNo, reason: "Missing uid." });
      continue;
    }

    const backendRaw = fields[backendIdx] ?? "";
    const backend_commission = toNumberOrNull(backendRaw);
    if (backend_commission === null || backend_commission < 0) {
      errors.push({ line: lineNo, reason: `Invalid backend_commission: "${backendRaw}".` });
      continue;
    }

    const volume = volumeIdx >= 0 ? toNumberOrNull(fields[volumeIdx] ?? "") : null;
    const fees = feesIdx >= 0 ? toNumberOrNull(fields[feesIdx] ?? "") : null;

    rows.push({ line: lineNo, uid, volume, fees, backend_commission });
  }

  return { rows, errors };
}

export type MatchedCommissionRow = ParsedCommissionRow & {
  matched_user_id: string | null;
  matched_plan_id: string | null;
  match_status: "matched" | "unmatched";
};

/**
 * Match parsed rows against verified broker_accounts for the given broker,
 * enriching each row with the recipient's user_id + current plan_id (for
 * reward-tier rate lookup). Rows whose UID has no verified account for this
 * broker come back unmatched — they're still stored (for audit) but earn no
 * reward.
 */
export async function matchCommissionRows(
  admin: SupabaseClient<Database>,
  brokerId: string,
  rows: ParsedCommissionRow[],
): Promise<MatchedCommissionRow[]> {
  const uids = [...new Set(rows.map((r) => r.uid))];
  if (uids.length === 0) return [];

  const { data: accounts } = await admin
    .from("broker_accounts")
    .select("uid, user_id")
    .eq("broker_id", brokerId)
    .eq("status", "verified")
    .in("uid", uids);

  const userIdByUid = new Map((accounts ?? []).map((a) => [a.uid, a.user_id]));
  const matchedUserIds = [...new Set(userIdByUid.values())];

  const { data: profiles } =
    matchedUserIds.length > 0
      ? await admin.from("profiles").select("id, plan_id").in("id", matchedUserIds)
      : { data: [] };
  const planByUser = new Map((profiles ?? []).map((p) => [p.id, p.plan_id]));

  return rows.map((r) => {
    const matchedUserId = userIdByUid.get(r.uid) ?? null;
    return {
      ...r,
      matched_user_id: matchedUserId,
      matched_plan_id: matchedUserId ? (planByUser.get(matchedUserId) ?? null) : null,
      match_status: matchedUserId ? "matched" : ("unmatched" as const),
    };
  });
}
