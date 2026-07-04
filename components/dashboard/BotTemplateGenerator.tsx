"use client";

import { useState, type FormEvent } from "react";
import { Bot, Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function BotTemplateGenerator() {
  const [strategyDescription, setStrategyDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/mentor/bot-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Template generation failed.");
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template generation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Paper bot template</h2>
          <p className="text-xs text-muted">A backtest/paper-tracking rule set — never auto-execution.</p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          required
          value={strategyDescription}
          onChange={(e) => setStrategyDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. Buy BTC when RSI dips below 30 on the 4H, exit at RSI 60 or -2% stop…"
          className={`${fieldClass} resize-none`}
        />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Generate template
        </button>
      </form>

      {answer && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
