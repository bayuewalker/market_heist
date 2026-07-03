"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { BrokerRow } from "@/lib/supabase/types";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

type PreviewResult = {
  row_count: number;
  matched_count: number;
  unmatched_count: number;
  total_backend_commission: number;
  errors: { line: number; reason: string }[];
  error_count: number;
  unmatched_uids: string[];
};

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function CommissionUploadForm({ brokers }: { brokers: BrokerRow[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brokerId, setBrokerId] = useState(brokers[0]?.id ?? "");
  const [period, setPeriod] = useState("");
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState<{ row_count: number; allocation_count: number } | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setCommitted(null);
    setCsv(await file.text());
  }

  async function runPreview() {
    if (!csv || !brokerId || !period) return;
    setLoading("preview");
    setError(null);
    try {
      const res = await fetch("/api/admin/commissions/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker_id: brokerId, period, csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Preview failed.");
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setLoading(null);
    }
  }

  async function runCommit() {
    if (!csv || !brokerId || !period) return;
    setLoading("commit");
    setError(null);
    try {
      const res = await fetch("/api/admin/commissions/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker_id: brokerId, period, csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed.");
      setCommitted({ row_count: data.row_count, allocation_count: data.allocation_count });
      setPreview(null);
      setCsv(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="broker" className="text-sm font-medium text-foreground">
            Broker
          </label>
          <select id="broker" value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={fieldClass}>
            {brokers.map((b) => (
              <option key={b.id} value={b.id} className="bg-surface">
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="period" className="text-sm font-medium text-foreground">
            Period
          </label>
          <input
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-07"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="csv-file" className="text-sm font-medium text-foreground">
          Commission CSV
        </label>
        <input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-strong"
        />
        <p className="text-xs text-muted">Columns: uid, volume, fees, backend_commission (header row required).</p>
        {fileName && <p className="text-xs text-foreground">{fileName}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {preview && (
        <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-background/40 p-4 text-sm">
          <p className="text-foreground">
            <strong>{preview.matched_count}</strong> matched / <strong>{preview.unmatched_count}</strong> unmatched
            of {preview.row_count} rows — total backend commission {fmtUsd(preview.total_backend_commission)}
          </p>
          {preview.error_count > 0 && (
            <p className="text-rose-300">{preview.error_count} row(s) had parse errors and will be skipped.</p>
          )}
          {preview.unmatched_uids.length > 0 && (
            <p className="text-muted">Unmatched UIDs: {preview.unmatched_uids.join(", ")}</p>
          )}
        </div>
      )}

      {committed && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-strong">
          Imported {committed.row_count} row(s), created {committed.allocation_count} reward ledger entries.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!csv || !brokerId || !period || loading !== null}
          onClick={runPreview}
        >
          {loading === "preview" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileUp className="h-4 w-4" aria-hidden="true" />
          )}
          Preview
        </Button>
        <Button type="button" disabled={!preview || loading !== null} onClick={runCommit}>
          {loading === "commit" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Commit import
        </Button>
      </div>
    </div>
  );
}
