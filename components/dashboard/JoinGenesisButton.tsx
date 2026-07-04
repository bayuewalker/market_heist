"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function JoinGenesisButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setPending(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ genesis_joined_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#06120d] transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
        Join the Genesis campaign
      </button>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
