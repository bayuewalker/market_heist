"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { CharacterConfigRow } from "@/lib/supabase/types";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

type TextField =
  | "character_name"
  | "role"
  | "tagline"
  | "avatar_url"
  | "banner_url"
  | "bot_intro_message"
  | "signal_prefix"
  | "dashboard_note_title"
  | "dashboard_note_body";

const FIELDS: { key: TextField; label: string; multiline?: boolean }[] = [
  { key: "character_name", label: "Character name" },
  { key: "role", label: "Role" },
  { key: "tagline", label: "Tagline" },
  { key: "avatar_url", label: "Avatar URL" },
  { key: "banner_url", label: "Banner URL" },
  { key: "signal_prefix", label: "Signal prefix" },
  { key: "bot_intro_message", label: "Bot intro message", multiline: true },
  { key: "dashboard_note_title", label: "Dashboard note title" },
  { key: "dashboard_note_body", label: "Dashboard note body", multiline: true },
];

export default function CharacterConfigForm({ config }: { config: CharacterConfigRow }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<TextField, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, config[f.key] ?? ""])) as Record<TextField, string>,
  );
  const [isActive, setIsActive] = useState(config.is_active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/character-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, ...values, is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed.");
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
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.filter((f) => !f.multiline).map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label htmlFor={f.key} className="text-sm font-medium text-foreground">
              {f.label}
            </label>
            <input
              id={f.key}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={fieldClass}
            />
          </div>
        ))}
      </div>

      {FIELDS.filter((f) => f.multiline).map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label htmlFor={f.key} className="text-sm font-medium text-foreground">
            {f.label}
          </label>
          <textarea
            id={f.key}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>
      ))}

      <label className="flex w-fit items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-border-subtle"
        />
        Active
      </label>

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
