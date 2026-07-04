"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { DonationLedgerRow } from "@/lib/supabase/types";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default function AdminDonationsTable({ donations }: { donations: DonationLedgerRow[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, description, amount, proof_url: proofUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not create entry.");
      setPeriod("");
      setDescription("");
      setAmount("");
      setProofUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create entry.");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/donations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not delete entry.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="donation-period" className="text-sm font-medium text-foreground">
              Period
            </label>
            <input
              id="donation-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-07"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="donation-amount" className="text-sm font-medium text-foreground">
              Amount (USDT)
            </label>
            <input
              id="donation-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150.00"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="donation-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <input
            id="donation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Donated to XYZ Foundation"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="donation-proof" className="text-sm font-medium text-foreground">
            Proof URL (optional)
          </label>
          <input
            id="donation-proof"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <Button
          type="button"
          disabled={!period || !description || !amount || creating}
          onClick={create}
          className="w-full sm:w-auto sm:self-start"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          Add entry
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Period</th>
              <th className="px-2 py-3 font-medium">Description</th>
              <th className="px-2 py-3 font-medium">Amount</th>
              <th className="px-2 py-3 font-medium">Recorded</th>
              <th className="px-2 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 text-muted">{d.period}</td>
                <td className="px-2 py-3 text-foreground">{d.description}</td>
                <td className="px-2 py-3 font-medium tabular-nums text-foreground">{fmtUsd(Number(d.amount))}</td>
                <td className="px-2 py-3 text-muted">{fmtDate(d.created_at)}</td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    disabled={deletingId === d.id}
                    onClick={() => remove(d.id)}
                    aria-label={`Delete donation entry for ${d.period}`}
                    className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    {deletingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {donations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-sm text-muted">
                  No donation entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
