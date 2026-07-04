import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { RiskLevel, SignalRow, SignalStatus } from "@/lib/supabase/types";

const biasStyles: Record<
  SignalRow["bias"],
  { label: string; className: string; Icon: typeof ArrowUpRight }
> = {
  long: { label: "Long", className: "text-accent-strong border-accent/40 bg-accent/10", Icon: ArrowUpRight },
  short: { label: "Short", className: "text-rose-300 border-rose-500/40 bg-rose-500/10", Icon: ArrowDownRight },
  neutral: { label: "Neutral", className: "text-muted border-border-subtle bg-white/5", Icon: Minus },
};

const STATUS_LABEL: Record<SignalStatus, string> = {
  pending: "Pending",
  active: "Active",
  hit_tp1: "Hit TP1",
  hit_tp2: "Hit TP2",
  hit_tp3: "Hit TP3",
  invalidated: "Invalidated",
  expired: "Expired",
  manual_closed: "Closed",
};

const TERMINAL_STATUSES: SignalStatus[] = ["hit_tp1", "hit_tp2", "hit_tp3", "invalidated", "expired", "manual_closed"];

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "text-accent-strong border-accent/40 bg-accent/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  high: "text-rose-300 border-rose-500/40 bg-rose-500/10",
};

function fmt(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(value);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function SignalCard({
  signal,
  actions,
}: {
  signal: SignalRow;
  actions?: ReactNode;
}) {
  const bias = biasStyles[signal.bias];
  const isTerminal = TERMINAL_STATUSES.includes(signal.status);
  const confidencePct =
    signal.confidence === null ? null : Math.round(signal.confidence * 100);

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 transition-colors hover:border-accent/30 ${
        isTerminal ? "opacity-70" : ""
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{signal.pair}</h3>
          <p className="text-xs text-muted">
            {[signal.market, signal.timeframe].filter(Boolean).join(" · ") || "—"} ·{" "}
            {fmtDate(signal.created_at)} UTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border-subtle px-2 py-1 text-xs font-medium text-muted">
            {STATUS_LABEL[signal.status]}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${bias.className}`}
          >
            <bias.Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {bias.label}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Entry", value: fmt(signal.entry), accent: false },
          { label: "Stop", value: fmt(signal.stop), accent: false },
          { label: "Invalidation", value: fmt(signal.invalidation), accent: false },
        ].map((cell) => (
          <div key={cell.label} className="rounded-lg border border-border-subtle bg-background/50 px-2.5 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted">{cell.label}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{cell.value}</p>
          </div>
        ))}
      </div>

      {(signal.tp1 !== null || signal.tp2 !== null || signal.tp3 !== null) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "TP1", value: signal.tp1 },
            { label: "TP2", value: signal.tp2 },
            { label: "TP3", value: signal.tp3 },
          ].map((cell) => (
            <div key={cell.label} className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">{cell.label}</p>
              <p className="text-sm font-semibold tabular-nums text-accent-strong">{fmt(cell.value)}</p>
            </div>
          ))}
        </div>
      )}

      {confidencePct !== null && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Confidence</span>
            <span className="tabular-nums">{confidencePct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>
      )}

      {signal.setup_reason && <p className="text-sm leading-relaxed text-foreground">{signal.setup_reason}</p>}
      {signal.rationale && <p className="text-sm leading-relaxed text-muted">{signal.rationale}</p>}
      {signal.ai_note && <p className="text-xs italic leading-relaxed text-muted">{signal.ai_note}</p>}

      <div className="flex flex-wrap gap-2">
        {signal.risk_level && (
          <span className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${RISK_STYLES[signal.risk_level]}`}>
            {signal.risk_level} risk
          </span>
        )}
        {signal.technique && (
          <span className="inline-flex w-fit items-center rounded-md border border-accent/20 bg-accent/5 px-2 py-0.5 text-[11px] font-medium text-accent-strong">
            {signal.technique}
          </span>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 border-t border-border-subtle pt-3">{actions}</div>}
    </article>
  );
}
