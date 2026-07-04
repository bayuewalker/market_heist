"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function PointsAdjustForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pointsDelta, setPointsDelta] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/points/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, points_delta: Number(pointsDelta), reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Adjustment failed.");
      setSuccess(`New balance: ${data.balance_after} HP.`);
      setPointsDelta("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Manual points adjustment</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
          required
          className={fieldClass}
        />
        <input
          type="number"
          value={pointsDelta}
          onChange={(e) => setPointsDelta(e.target.value)}
          placeholder="+/- points"
          required
          className={fieldClass}
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          required
          className={fieldClass}
        />
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {success && <p className="text-xs text-accent-strong">{success}</p>}
      <Button type="submit" size="md" disabled={loading} className="w-fit">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Apply adjustment
      </Button>
    </form>
  );
}
