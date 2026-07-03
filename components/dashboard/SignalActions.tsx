"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SignalRow } from "@/lib/supabase/types";

export default function SignalActions({ signal }: { signal: SignalRow }) {
  const router = useRouter();
  const [pending, setPending] = useState<"close" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markClosed() {
    setPending("close");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("signals")
      .update({ status: "closed" })
      .eq("id", signal.id);
    if (updateError) setError(updateError.message);
    else router.refresh();
    setPending(null);
  }

  async function deleteSignal() {
    setPending("delete");
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("signals").delete().eq("id", signal.id);
    if (deleteError) setError(deleteError.message);
    else router.refresh();
    setPending(null);
  }

  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {signal.status === "active" && (
          <button
            type="button"
            onClick={markClosed}
            disabled={pending !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-strong disabled:opacity-50"
          >
            {pending === "close" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Mark closed
          </button>
        )}

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Delete this signal?</span>
            <button
              type="button"
              onClick={deleteSignal}
              disabled={pending !== null}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              {pending === "delete" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={pending !== null}
              className="text-xs text-muted underline hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
