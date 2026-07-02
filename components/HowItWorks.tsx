"use client";

import { motion } from "framer-motion";
import { MessageSquareText, ScanSearch, Signal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Card from "./ui/Card";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { processSteps } from "@/data/process";

const icons: LucideIcon[] = [MessageSquareText, ScanSearch, Signal];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Product"
          title="How It Works"
          subtitle="Input request → AI analyzes → Signal & Strategy output."
        />

        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Connector line across cards on desktop */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[3.75rem] hidden h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent lg:block"
          />

          {processSteps.map((item, index) => {
            const Icon = icons[index];
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                className={index === 2 ? "sm:col-span-2 lg:col-span-1" : ""}
              >
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25 transition-colors group-hover:bg-accent/20">
                      <span className="animate-pulse-glow absolute inset-0 rounded-xl bg-accent/15 blur-md" />
                      <Icon className="relative h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-sm font-semibold text-muted transition-colors group-hover:border-accent/50 group-hover:text-accent-strong">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{item.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
