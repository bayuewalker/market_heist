"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function MissionClaimButton({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not claim reward.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim reward.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="md" disabled={loading} onClick={claim}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Claim
      </Button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
