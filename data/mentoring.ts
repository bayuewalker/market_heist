export type MentoringSession = {
  day: string;
  time: string;
  topic: string;
  /** Minimum plan tier required to join. */
  minPlan: "basic" | "pro";
};

export const weeklySchedule: MentoringSession[] = [
  { day: "Monday", time: "14:00 UTC", topic: "Crypto market open & key levels", minPlan: "pro" },
  { day: "Tuesday", time: "14:00 UTC", topic: "Forex session overlap breakdown", minPlan: "pro" },
  { day: "Wednesday", time: "14:00 UTC", topic: "Mid-week trend check & Q&A", minPlan: "pro" },
  { day: "Thursday", time: "14:00 UTC", topic: "Commodity & macro catalysts", minPlan: "pro" },
  {
    day: "Friday",
    time: "14:00 UTC",
    topic: "Weekly live trade session — open to all Heisters",
    minPlan: "basic",
  },
];

export const eliteWorkshop = {
  cadence: "Monthly",
  topic: "Elite-only deep-dive workshop",
};
