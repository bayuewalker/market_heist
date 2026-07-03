"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function ProfileNameForm({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", userId);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="fullName" className="text-xs text-muted">
          Name
        </label>
        <input
          id="fullName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Your name"
        />
      </div>
      <button
        type="submit"
        disabled={loading || name.trim() === initialName.trim()}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : saved ? (
          <Check className="h-4 w-4 text-accent-strong" aria-hidden="true" />
        ) : null}
        Save
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </form>
  );
}
