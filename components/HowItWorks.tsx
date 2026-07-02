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
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Product"
          title="How It Works"
          subtitle="Input request → AI analyzes → Signal & Strategy output."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {processSteps.map((item, index) => {
            const Icon = icons[index];
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={index === 2 ? "sm:col-span-2 lg:col-span-1" : ""}
              >
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent-strong ring-1 ring-inset ring-accent/25 transition-colors group-hover:bg-accent/20">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-muted">{item.step}</span>
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
