"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Send, Unlink } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LinkTelegramSection({
  linked,
  telegramUsername,
}: {
  linked: boolean;
  telegramUsername: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  async function startLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not start linking.");
      if (data.already_linked) {
        router.refresh();
        return;
      }
      setDeepLink(data.deep_link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start linking.");
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link/unlink", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not unlink.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink.");
    } finally {
      setLoading(false);
    }
  }

  if (linked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          Linked{telegramUsername ? <> as @{telegramUsername}</> : null}
        </p>
        <Button variant="secondary" size="md" disabled={loading} onClick={unlink}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Unlink className="h-4 w-4" aria-hidden="true" />}
          Unlink
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Link your Telegram account to get signal alerts, mission updates, and bot commands.
      </p>
      {deepLink ? (
        <Button href={deepLink} target="_blank" rel="noopener noreferrer">
          <Send className="h-4 w-4" aria-hidden="true" />
          Open Telegram to finish linking
        </Button>
      ) : (
        <Button disabled={loading} onClick={startLink} className="w-fit">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          Link Telegram
        </Button>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
