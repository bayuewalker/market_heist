"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function BotSettingsForm({
  initialUsername,
  hasToken,
  envFallbackConfigured,
}: {
  initialUsername: string | null;
  hasToken: boolean;
  envFallbackConfigured: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const body: Record<string, string> = {};
    if (username.trim() && username.trim() !== (initialUsername ?? "")) body.telegram_bot_username = username.trim();
    if (token.trim()) body.telegram_bot_token = token.trim();

    if (Object.keys(body).length === 0) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/bot-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed.");
      setToken("");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6"
    >
      <div>
        <h2 className="font-semibold text-foreground">Telegram Bot</h2>
        <p className="mt-0.5 text-sm text-muted">
          Powers Telegram Login, the bot commands, and identity linking. An admin-set value here overrides the
          server&apos;s env vars without a redeploy.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {hasToken ? (
          <span className="inline-flex items-center gap-1.5 text-accent-strong">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Bot token configured
          </span>
        ) : envFallbackConfigured ? (
          <span className="text-muted">No admin-set token — currently using the server&apos;s env var.</span>
        ) : (
          <span className="text-muted">No bot token configured yet — Telegram features are disabled.</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telegram_bot_username" className="text-sm font-medium text-foreground">
          Bot username
        </label>
        <input
          id="telegram_bot_username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="MarketHeistBot"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telegram_bot_token" className="text-sm font-medium text-foreground">
          New bot token
        </label>
        <input
          id="telegram_bot_token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={hasToken ? "•••••••• (leave blank to keep current token)" : "Paste the token from @BotFather"}
          className={fieldClass}
        />
        <p className="text-xs text-muted">
          Write-only — once saved, the token is never shown again here or anywhere else in the admin panel.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-strong">
          Saved.
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-fit">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Save changes
      </Button>
    </form>
  );
}
