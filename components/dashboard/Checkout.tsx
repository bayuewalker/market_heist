"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { planAmountUsd } from "@/lib/pricing";
import type { PaymentPeriod, PlanRow } from "@/lib/supabase/types";

type Order = {
  payment_id: string;
  address: string;
  amount_usdt: number;
  network: string;
  plan_name: string;
  expires_at: string;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-background/60 px-3 py-2 text-left font-mono text-sm text-foreground transition-colors hover:border-accent/50"
      >
        <span className="truncate">{value}</span>
        {copied ? (
          <Check className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export default function Checkout({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const purchasable = plans.filter((p) => p.price_monthly && p.price_monthly > 0);
  const [planId, setPlanId] = useState(purchasable[0]?.id ?? "pro");
  const [period, setPeriod] = useState<PaymentPeriod>("monthly");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<"pending" | "confirmed" | "expired">("pending");
  const [qr, setQr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPlan = purchasable.find((p) => p.id === planId) ?? purchasable[0];
  const displayPrice = selectedPlan?.price_monthly
    ? planAmountUsd(selectedPlan.price_monthly, period)
    : 0;

  useEffect(() => {
    if (!order) return;
    QRCode.toDataURL(order.address, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [order]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!order || status !== "pending") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?id=${order.payment_id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "confirmed") {
          setStatus("confirmed");
          stopPolling();
          router.refresh();
        } else if (data.status === "expired") {
          setStatus("expired");
          stopPolling();
        }
      } catch {
        /* keep polling */
      }
    };
    pollRef.current = setInterval(poll, 8000);
    poll();
    return stopPolling;
  }, [order, status, router, stopPolling]);

  async function createOrder() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not start the payment.");
      setOrder(data as Order);
      setStatus("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    stopPolling();
    setOrder(null);
    setStatus("pending");
    setQr(null);
    setError(null);
  }

  if (!selectedPlan) {
    return <p className="text-sm text-muted">No purchasable plans are configured.</p>;
  }

  // ---- Confirmed ----
  if (order && status === "confirmed") {
    return (
      <div className="gradient-border flex flex-col items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent-strong">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Payment confirmed 🎉</h3>
        <p className="text-sm text-muted">
          Your {order.plan_name} membership is now active. Enjoy, Heister.
        </p>
        <Button href="/dashboard">Go to dashboard</Button>
      </div>
    );
  }

  // ---- Awaiting payment ----
  if (order) {
    const expired = status === "expired";
    return (
      <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {expired ? "Order expired" : "Send USDT to complete"}
          </h3>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-strong">
            TRON · TRC20
          </span>
        </div>

        {expired ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">This payment window closed. Start a new order to try again.</p>
            <Button onClick={reset}>New order</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="Payment address QR code"
                  width={180}
                  height={180}
                  className="rounded-xl border border-border-subtle bg-white p-2"
                />
              )}
              <p className="text-xs text-muted">
                Scan or copy the address, then send the <strong className="text-foreground">exact</strong> amount.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">Exact amount (USDT)</span>
                <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-center text-2xl font-bold tabular-nums text-accent-strong">
                  {order.amount_usdt}
                </div>
              </div>
              <CopyField label="Wallet address (TRC20)" value={order.address} />
              <CopyField label="Amount to copy" value={String(order.amount_usdt)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-background/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin text-accent-strong" aria-hidden="true" />
                Waiting for payment…
              </span>
              <span className="text-muted">
                Expires in <Countdown expiresAt={order.expires_at} />
              </span>
            </div>

            <p className="text-xs text-muted">
              Send only <strong>USDT on TRON (TRC20)</strong> and the exact amount, or the payment can&rsquo;t be
              matched automatically. Confirmation is usually under a minute.
            </p>
            <button type="button" onClick={reset} className="text-left text-xs text-muted underline hover:text-foreground">
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- Plan selection ----
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface p-6">
      {purchasable.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {purchasable.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                planId === p.id
                  ? "border-accent/50 bg-accent/15 text-accent-strong"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="inline-flex w-fit items-center rounded-full border border-border-subtle bg-background/60 p-1">
        {(["monthly", "annual"] as PaymentPeriod[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setPeriod(opt)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              period === opt ? "bg-accent text-[#06120d]" : "text-muted hover:text-foreground"
            }`}
          >
            {opt}
            {opt === "annual" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  period === opt ? "bg-[#06120d]/20 text-[#06120d]" : "bg-accent/15 text-accent-strong"
                }`}
              >
                -20%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-foreground">${displayPrice}</span>
        <span className="pb-1 text-sm text-muted">
          {period === "annual" ? "/ year" : "/ month"} in USDT
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <Button onClick={createOrder} disabled={creating} size="lg" className="w-full sm:w-auto sm:self-start">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Pay with USDT
      </Button>
      <p className="text-xs text-muted">
        Pay-per-period · no auto-renew. Your membership extends by {period === "annual" ? "365" : "30"} days on
        confirmation.
      </p>
    </div>
  );
}
