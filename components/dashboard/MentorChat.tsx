"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

type ChatTurn = { role: "user" | "mentor"; text: string };

type QuickAction = { key: string; label: string; message: string; context: string };

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function MentorChat({
  latestSignalContext,
  journalSummaryContext,
  overtradingContext,
  brokerContext,
  focusedSignalContext = null,
  focusedSignalLabel = null,
}: {
  latestSignalContext: string | null;
  journalSummaryContext: string | null;
  overtradingContext: string | null;
  brokerContext: string | null;
  focusedSignalContext?: string | null;
  focusedSignalLabel?: string | null;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const focusedMessage = `Explain this ${focusedSignalLabel ?? "signal"} in plain, risk-first language — the bias, entry, invalidation, targets, and what would make this setup wrong.`;

  // When arriving from a signal card's "Ask Mentor Heister about this signal"
  // deep link, auto-ask about that specific signal so the explanation is
  // already generating on open. Keyed off the focused context so it also fires
  // when the member navigates client-side to a different `?signal=` while the
  // component stays mounted; the ref guards against re-asking the same signal
  // (incl. React's dev double-mount).
  const lastAskedContextRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusedSignalContext || lastAskedContextRef.current === focusedSignalContext) return;
    lastAskedContextRef.current = focusedSignalContext;
    send(focusedMessage, focusedSignalContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSignalContext]);

  const quickActions = (
    [
      latestSignalContext
        ? {
            key: "explain-signal",
            label: "Explain my latest signal",
            message: "Explain my most recent signal in plain language — why this setup, and what should I watch for?",
            context: latestSignalContext,
          }
        : null,
      brokerContext
        ? {
            key: "suggest-broker-route",
            label: "Suggest a broker route",
            message: "Based on my broker status, what should my next step be?",
            context: brokerContext,
          }
        : null,
      journalSummaryContext
        ? {
            key: "summarize-journal",
            label: "Summarize my journal",
            message: "Summarize my recent journaled trades and what patterns you notice.",
            context: journalSummaryContext,
          }
        : null,
      overtradingContext
        ? {
            key: "overtrading-warning",
            label: "Am I overtrading?",
            message: "Based on my trade frequency, am I at risk of overtrading?",
            context: overtradingContext,
          }
        : null,
    ] satisfies (QuickAction | null)[]
  ).filter((a): a is QuickAction => a !== null);

  async function send(text: string, context?: string) {
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text }]);
    setMessage("");

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Mentor request failed.");
      setTurns((prev) => [...prev, { role: "mentor", text: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mentor request failed.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(message);
  }

  return (
    <div className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Mentor Heister</h2>
          <p className="text-xs text-muted">Educational trading mentor — never a signal to auto-execute.</p>
        </div>
      </header>

      {focusedSignalContext && (
        <button
          type="button"
          disabled={pending}
          onClick={() => send(focusedMessage, focusedSignalContext)}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/15 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Explain {focusedSignalLabel ?? "this signal"} again
        </button>
      )}

      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={pending}
              onClick={() => send(action.message, action.context)}
              className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-strong disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex max-h-[420px] min-h-[120px] flex-col gap-3 overflow-y-auto rounded-xl border border-border-subtle bg-background/40 p-3 sm:p-4">
        {turns.length === 0 && !pending && (
          <p className="text-sm text-muted">
            Ask about a setup, position sizing, your trading habits, or anything else — Mentor Heister keeps
            it educational, risk-aware, and never promises an outcome.
          </p>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              turn.role === "user"
                ? "self-end bg-accent/15 text-foreground"
                : "self-start bg-white/5 text-foreground"
            }`}
          >
            {turn.text}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 self-start rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Mentor is thinking…
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Mentor Heister anything…"
          maxLength={1000}
          disabled={pending}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={pending || !message.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Send
        </button>
      </form>

      <p className="text-xs text-muted">Educational only — not financial advice. No outcome is guaranteed.</p>
    </div>
  );
}
