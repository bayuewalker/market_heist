"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

// Mirrors lib/missions.ts's MISSION_TRIGGER_TYPES — the only trigger_types
// isMissionSatisfied() actually recognizes. There's deliberately no "manual"
// option: a mission created with an unrecognized trigger would sit
// permanently pending in every member's mission list, since nothing would
// ever mark it completed. Manual point awards go through the separate admin
// points-adjustment flow instead.
const TRIGGER_TYPES = [
  { value: "complete_profile", label: "Complete profile" },
  { value: "join_telegram", label: "Link Telegram" },
  { value: "login_dashboard", label: "Log in to dashboard" },
  { value: "submit_broker_uid", label: "Submit broker UID" },
  { value: "uid_verified", label: "Broker UID verified" },
  { value: "read_first_signal", label: "Read first signal" },
  { value: "complete_risk_profile", label: "Complete risk profile" },
  { value: "refer_member", label: "Refer a member" },
];

export default function CreateMissionForm() {
  const router = useRouter();
  const [missionKey, setMissionKey] = useState("");
  const [publicName, setPublicName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsReward, setPointsReward] = useState("");
  const [triggerType, setTriggerType] = useState(TRIGGER_TYPES[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_key: missionKey,
          public_name: publicName,
          description: description || undefined,
          points_reward: Number(pointsReward),
          trigger_type: triggerType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Create failed.");
      setMissionKey("");
      setPublicName("");
      setDescription("");
      setPointsReward("");
      setTriggerType(TRIGGER_TYPES[0].value);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Create mission</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={missionKey}
          onChange={(e) => setMissionKey(e.target.value)}
          placeholder="mission_key (e.g. weekly_checkin)"
          required
          pattern="[a-z0-9_]+"
          title="Lowercase letters, numbers, and underscores only."
          className={fieldClass}
        />
        <input
          value={publicName}
          onChange={(e) => setPublicName(e.target.value)}
          placeholder="Public name (e.g. Weekly Check-In)"
          required
          className={fieldClass}
        />
        <input
          type="number"
          min={0}
          value={pointsReward}
          onChange={(e) => setPointsReward(e.target.value)}
          placeholder="Points reward"
          required
          className={fieldClass}
        />
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={fieldClass}>
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={fieldClass}
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <Button type="submit" size="md" disabled={loading} className="w-fit">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Create mission
      </Button>
    </form>
  );
}
