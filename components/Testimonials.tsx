"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { testimonials } from "@/data/testimonials";

const AUTOPLAY_MS = 6000;

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = testimonials.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion.current) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, total]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  const current = testimonials[index];

  return (
    <section id="testimonials" className="relative py-20 sm:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Community"
          title="The Experience of Market Heister Members"
          subtitle="Share this information with others, feel and enjoy the benefits of being a member of Market Heist directly."
        />

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Member testimonials"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="gradient-border relative mx-auto w-full max-w-2xl rounded-2xl border border-border-subtle bg-surface p-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-10"
        >
          <Quote className="h-8 w-8 text-accent/40" aria-hidden="true" />

          <div aria-live="polite" className="min-h-[180px]">
            <AnimatePresence mode="wait">
              <motion.figure
                key={current.name}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-4 flex flex-col gap-6"
              >
                <blockquote className="text-balance text-lg leading-relaxed text-foreground sm:text-xl">
                  “{current.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-strong ring-1 ring-inset ring-accent/30">
                    {current.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {current.name}
                    </span>
                    <span className="block text-xs uppercase tracking-wide text-muted">
                      {current.role}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-6">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous testimonial"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-foreground transition-colors hover:border-accent/60 hover:text-accent-strong"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <span className="text-sm font-medium tabular-nums text-muted" aria-hidden="true">
              {index + 1} / {total}
            </span>

            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next testimonial"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-foreground transition-colors hover:border-accent/60 hover:text-accent-strong"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
