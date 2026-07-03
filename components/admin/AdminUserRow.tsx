"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import type { PlanRow, ProfileRow } from "@/lib/supabase/types";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

export default function AdminUserRow({
  profile,
  plans,
  isSelf,
}: {
  profile: ProfileRow;
  plans: PlanRow[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<"plan" | "role" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>, kind: "plan" | "role") {
    setSaving(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${profile.id}`, {
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
    <tr className="border-b border-border-subtle last:border-0">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-foreground">{profile.full_name?.trim() || "—"}</p>
        <p className="text-xs text-muted">{profile.email}</p>
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      </td>
      <td className="py-3 pr-4">
        <select
          value={profile.plan_id}
          disabled={saving !== null}
          onChange={(e) => update({ plan_id: e.target.value }, "plan")}
          className="rounded-lg border border-border-subtle bg-background/60 px-2.5 py-1.5 text-sm text-foreground"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id} className="bg-surface">
              {p.name}
            </option>
          ))}
        </select>
        {saving === "plan" && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{fmtDate(profile.plan_expires_at)}</td>
      <td className="py-3 pr-4">
        <button
          type="button"
          disabled={saving !== null || isSelf}
          onClick={() => update({ role: profile.role === "admin" ? "member" : "admin" }, "role")}
          title={isSelf ? "You can't change your own admin role" : undefined}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            profile.role === "admin"
              ? "border-accent/40 bg-accent/10 text-accent-strong"
              : "border-border-subtle text-muted hover:text-foreground"
          }`}
        >
          {saving === "role" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : profile.role === "admin" ? (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {profile.role === "admin" ? "Admin" : "Member"}
        </button>
      </td>
      <td className="py-3 text-sm text-muted">{fmtDate(profile.created_at)}</td>
    </tr>
  );
}
