"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { BrokerAccountRow, BrokerAccountStatus } from "@/lib/supabase/types";

const STATUSES: BrokerAccountStatus[] = [
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "duplicate",
  "inactive",
];

const statusColor: Record<BrokerAccountStatus, string> = {
  submitted: "text-amber-300",
  under_review: "text-amber-300",
  verified: "text-accent-strong",
  rejected: "text-rose-300",
  duplicate: "text-rose-300",
  inactive: "text-muted",
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function AdminBrokerAccountRow({
  account,
  brokerName,
  memberEmail,
}: {
  account: BrokerAccountRow;
  brokerName: string;
  memberEmail: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<"status" | "note" | null>(null);
  const [note, setNote] = useState(account.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>, kind: "status" | "note") {
    setSaving(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/broker-accounts/${account.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <tr className="border-b border-border-subtle text-sm last:border-0">
      <td className="px-2 py-3 text-muted">{memberEmail}</td>
      <td className="px-2 py-3 font-medium text-foreground">{brokerName}</td>
      <td className="px-2 py-3 font-mono text-xs text-foreground">{account.uid}</td>
      <td className="px-2 py-3">
        <select
          value={account.status}
          disabled={saving !== null}
          onChange={(e) => update({ status: e.target.value }, "status")}
          className={`rounded-lg border border-border-subtle bg-background/60 px-2.5 py-1.5 text-sm font-medium capitalize ${statusColor[account.status]}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-surface text-foreground">
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {saving === "status" && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      </td>
      <td className="px-2 py-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== (account.note ?? "")) update({ note }, "note");
          }}
          disabled={saving !== null}
          placeholder="Reason / note"
          className="w-40 rounded-lg border border-border-subtle bg-background/60 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted/70"
        />
      </td>
      <td className="px-2 py-3 text-muted">{fmtDate(account.created_at)}</td>
    </tr>
  );
}
