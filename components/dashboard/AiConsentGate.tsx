"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

const DATA_USES = [
  { label: "AI Data", detail: "Your questions and Mentor's answers are sent to the AI provider to generate a response." },
  { label: "Journal Data", detail: "Trades you log in your journal may be summarized for Mentor's trade-review and journal-summary answers." },
  { label: "Broker Activity Data", detail: "Your verified broker status may inform Mentor's broker-route suggestions." },
  { label: "Reward Data", detail: "Your points/rank/reward history may inform Mentor's context, never shared outside your own session." },
];

export default function AiConsentGate() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setPending(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ ai_consent_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="gradient-border flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Before you talk to Mentor Heister</h2>
          <p className="text-sm text-muted">A quick heads-up on what Mentor uses to answer you.</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {DATA_USES.map((use) => (
          <li key={use.label} className="rounded-lg border border-border-subtle bg-background/50 px-3.5 py-2.5">
            <p className="text-sm font-medium text-foreground">{use.label}</p>
            <p className="text-xs text-muted">{use.detail}</p>
          </li>
        ))}
      </ul>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <Button type="button" size="lg" onClick={accept} disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        I understand, continue
      </Button>

      <p className="text-xs text-muted">
        A full breakdown of how your data is used will be published on the Trust pages. You can ask to stop
        using Mentor at any time.
      </p>
    </div>
  );
}
