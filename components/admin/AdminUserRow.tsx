"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { PlanRow, ProfileRow, UserRole } from "@/lib/supabase/types";

const ROLE_LABEL: Record<UserRole, string> = { member: "Member", captain: "Captain", admin: "Admin" };

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
        <select
          value={profile.role}
          disabled={saving !== null || isSelf}
          onChange={(e) => update({ role: e.target.value }, "role")}
          title={isSelf ? "You can't change your own role" : undefined}
          className={`rounded-lg border px-2.5 py-1.5 text-sm disabled:opacity-50 ${
            profile.role === "admin"
              ? "border-accent/40 bg-accent/10 text-accent-strong"
              : "border-border-subtle bg-background/60 text-foreground"
          }`}
        >
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => (
            <option key={role} value={role} className="bg-surface">
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
        {saving === "role" && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
      </td>
      <td className="py-3 text-sm text-muted">{fmtDate(profile.created_at)}</td>
    </tr>
  );
}
