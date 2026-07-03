"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setPassword("");
      setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-xs text-muted">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            minLength={6}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-xs text-muted">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            minLength={6}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : saved ? (
          <Check className="h-4 w-4 text-accent-strong" aria-hidden="true" />
        ) : null}
        {saved ? "Password updated" : "Update password"}
      </button>
    </form>
  );
}
