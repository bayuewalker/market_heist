"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RiskProfile } from "@/lib/supabase/types";

const OPTIONS: { value: RiskProfile; label: string }[] = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

export default function RiskProfilePicker({ userId, current }: { userId: string; current: RiskProfile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState<RiskProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(value: RiskProfile) {
    setSaving(value);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ risk_profile: value }).eq("id", userId);
    if (updateError) {
      setError(updateError.message);
    } else {
      router.refresh();
    }
    setSaving(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving !== null}
            onClick={() => choose(opt.value)}
            aria-pressed={current === opt.value}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              current === opt.value
                ? "border-accent/50 bg-accent/15 text-accent-strong"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {saving === opt.value && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
