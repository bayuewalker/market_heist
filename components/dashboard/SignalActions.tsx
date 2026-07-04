"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SignalRow, SignalStatus } from "@/lib/supabase/types";

const TRANSITIONS: { status: SignalStatus; label: string }[] = [
  { status: "hit_tp1", label: "Hit TP1" },
  { status: "hit_tp2", label: "Hit TP2" },
  { status: "hit_tp3", label: "Hit TP3" },
  { status: "invalidated", label: "Invalidated" },
  { status: "manual_closed", label: "Close" },
];

export default function SignalActions({ signal }: { signal: SignalRow }) {
  const router = useRouter();
  const [pending, setPending] = useState<SignalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: SignalStatus, label: string) {
    setPending(status);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase.from("signals").update({ status }).eq("id", signal.id);
    if (updateError) {
      setError(updateError.message);
      setPending(null);
      return;
    }

    // Best-effort lifecycle log — a failure here shouldn't undo the status
    // change the member just made.
    await supabase.from("signal_updates").insert({
      signal_id: signal.id,
      status_change: status,
      update_text: `Marked "${label}" by the member.`,
    });

    router.refresh();
    setPending(null);
  }

  if (signal.status !== "active" && signal.status !== "pending") {
    return null;
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      {TRANSITIONS.map((t) => (
        <button
          key={t.status}
          type="button"
          onClick={() => setStatus(t.status, t.label)}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-strong disabled:opacity-50"
        >
          {pending === t.status && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {t.label}
        </button>
      ))}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
