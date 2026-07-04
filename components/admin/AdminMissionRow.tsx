"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { MissionRow } from "@/lib/supabase/types";

export default function AdminMissionRow({ mission }: { mission: MissionRow }) {
  const router = useRouter();
  const [points, setPoints] = useState(String(mission.points_reward));
  const [saving, setSaving] = useState<"active" | "points" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>, kind: "active" | "points") {
    setSaving(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/missions/${mission.id}`, {
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
      <td className="px-2 py-3">
        <p className="font-medium text-foreground">{mission.public_name}</p>
        <p className="text-xs text-muted">{mission.mission_key}</p>
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      </td>
      <td className="px-2 py-3 text-muted">{mission.trigger_type}</td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onBlur={() => {
              const n = Number(points);
              if (Number.isFinite(n) && n !== mission.points_reward) update({ points_reward: n }, "points");
            }}
            disabled={saving !== null}
            className="w-20 rounded-lg border border-border-subtle bg-background/60 px-2 py-1.5 text-sm text-foreground"
          />
          {saving === "points" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
        </div>
      </td>
      <td className="px-2 py-3">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => update({ is_active: !mission.is_active }, "active")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            mission.is_active
              ? "border-accent/40 bg-accent/10 text-accent-strong"
              : "border-border-subtle text-muted hover:text-foreground"
          }`}
        >
          {saving === "active" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {mission.is_active ? "Active" : "Disabled"}
        </button>
      </td>
    </tr>
  );
}
