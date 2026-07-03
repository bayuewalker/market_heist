"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Could not delete your account.");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-left text-sm font-medium text-rose-300 hover:underline"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
      <p className="flex items-start gap-2 text-sm text-rose-200">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        This permanently deletes your account, signals, and payment history. This can&rsquo;t be
        undone.
      </p>
      <label htmlFor="confirmDelete" className="text-xs text-muted">
        Type <strong className="text-foreground">DELETE</strong> to confirm
      </label>
      <input
        id="confirmDelete"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="w-full max-w-xs rounded-lg border border-rose-500/30 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-rose-400 focus:outline-none"
        placeholder="DELETE"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={confirmText !== "DELETE" || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Permanently delete
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={loading}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
