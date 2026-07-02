"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, HeartHandshake } from "lucide-react";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { pricingPlans, yearlyDiscountPercent } from "@/data/pricing";
import { asset } from "@/lib/asset";

type Billing = "monthly" | "yearly";

function formatPrice(priceMonthly: number | null, billing: Billing) {
  if (priceMonthly === null) return "—";
  if (priceMonthly === 0) return "Free";
  const price =
    billing === "yearly"
      ? Math.round((priceMonthly * (100 - yearlyDiscountPercent)) / 100)
      : priceMonthly;
  return `$${price}`;
}

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Pricing"
          title="Pricing"
          subtitle="Save up to 20% with the annual package."
        />

        <div className="flex justify-center">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex items-center rounded-full border border-border-subtle bg-surface p-1"
          >
            {(["monthly", "yearly"] as Billing[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={billing === option}
                onClick={() => setBilling(option)}
                className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors ${
                  billing === option
                    ? "bg-accent text-[#06120d]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {option}
                {option === "yearly" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      billing === option
                        ? "bg-[#06120d]/20 text-[#06120d]"
                        : "bg-accent/15 text-accent-strong"
                    }`}
                  >
                    Save {yearlyDiscountPercent}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={plan.highlighted ? "lg:-my-4" : ""}
            >
              <Card
                highlighted={plan.highlighted}
                className={`flex h-full flex-col gap-6 ${plan.highlighted ? "lg:py-10" : ""}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-[#06120d] shadow-[0_6px_20px_-6px_rgba(47,226,138,0.9)]">
                    {plan.badge}
                  </span>
                )}

                {plan.highlighted && (
                  <Image
                    src={asset("/assets/visual-square.png")}
                    alt=""
                    width={64}
                    height={64}
                    aria-hidden="true"
                    className="animate-floaty pointer-events-none absolute right-5 top-6 h-12 w-12 opacity-90 drop-shadow-[0_0_16px_rgba(47,226,138,0.5)]"
                  />
                )}

                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    {plan.name}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(plan.priceMonthly, billing)}
                    </span>
                    {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                      <span className="pb-1 text-sm text-muted">/ month</span>
                    )}
                  </div>
                  {plan.priceMonthly !== null && plan.priceMonthly > 0 && billing === "yearly" && (
                    <p className="text-xs text-muted">Billed annually</p>
                  )}
                </div>

                <ul className="flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === "elite" ? (
                  <Button variant="secondary" className="w-full" disabled>
                    {plan.cta}
                  </Button>
                ) : (
                  <Button
                    href="#top"
                    variant={plan.highlighted ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="mx-auto flex max-w-xl items-center justify-center gap-2 text-center text-sm text-muted">
          <HeartHandshake className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
          We donate 2% of your membership to pediatric well-being.
        </p>
      </Container>
    </section>
  );
}
