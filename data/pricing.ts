export type PricingPlan = {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number | null;
  cta: string;
  highlighted?: boolean;
  features: string[];
};

export const yearlyDiscountPercent = 20;

export const pricingPlans: PricingPlan[] = [
  {
    id: "basic",
    name: "Market Heister Basic",
    priceMonthly: 0,
    cta: "Join Free",
    features: [
      "Daily trend updates",
      "3 signal pair recommendations",
      "Weekly live trade session & mentoring",
    ],
  },
  {
    id: "pro",
    name: "Market Heist Pro",
    badge: "Popular",
    priceMonthly: 32,
    cta: "Upgrade Pro",
    highlighted: true,
    features: [
      "Daily trend updates",
      "10 signal pair recommendations",
      "Crypto, forex & commodity market signals",
      "Live trade session & mentoring every weekday",
    ],
  },
  {
    id: "elite",
    name: "Market Heist Elite",
    priceMonthly: null,
    cta: "Coming Soon",
    features: [
      "Daily trend updates",
      "Signal requests unlocked for any market pair",
      "Live trade session & mentoring every weekday",
      "Commodity market signals",
      "Crypto market signals",
      "Forex market signals",
      "Monthly workshop for Elite members only",
    ],
  },
];
