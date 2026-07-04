import { randomBytes } from "crypto";

export type CaptainTier = "Scout" | "Recruiter" | "Squad Leader" | "Network Captain" | "Elite Captain";

// Tiers are based on total referred signups (captain_networks row count) —
// Captain Code V1 is intentionally lightweight (§11.2 #17 scopes the full
// Captain Dashboard, with verification-gated tiering, out to V2/§17.2).
const TIERS: { name: CaptainTier; minReferred: number }[] = [
  { name: "Elite Captain", minReferred: 50 },
  { name: "Network Captain", minReferred: 25 },
  { name: "Squad Leader", minReferred: 10 },
  { name: "Recruiter", minReferred: 3 },
  { name: "Scout", minReferred: 0 },
];

export function getCaptainTier(referredCount: number): CaptainTier {
  return (TIERS.find((t) => referredCount >= t.minReferred) ?? TIERS[TIERS.length - 1]).name;
}

/** 8 hex chars — short enough to type/share, ~4.3 billion possible codes. */
export function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}
