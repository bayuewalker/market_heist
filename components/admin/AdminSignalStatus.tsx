"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { SignalStatus } from "@/lib/supabase/types";

const STATUSES: SignalStatus[] = [
  "pending",
  "active",
  "hit_tp1",
  "hit_tp2",
  "hit_tp3",
  "invalidated",
  "expired",
  "manual_closed",
];

export default function AdminSignalStatus({ signalId, status }: { signalId: string; status: SignalStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: SignalStatus) {
    if (next === status) return;
    setPending(true);
    setError(null);

    const res = await fetch(`/api/admin/signals/${signalId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Update failed.");
      setPending(false);
      return;
    }

    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as SignalStatus)}
        className="rounded-md border border-border-subtle bg-background/50 px-1.5 py-1 text-xs capitalize text-foreground disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden="true" />}
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </div>
  );
}
