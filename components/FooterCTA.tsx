"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Mail } from "lucide-react";
import Logo from "./Logo";
import Button from "./ui/Button";
import Container from "./ui/Container";
import { navLinks } from "@/data/nav";

const CONTACT_EMAIL = "Info@marketheist.com";

export default function FooterCTA() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-border-subtle pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(47,226,138,0.14),transparent)]"
      />
      <Container className="relative flex flex-col items-center gap-6 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent-strong">
            Reach out anytime
          </span>
          <h2 className="text-balance max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Ready to Heist the Market? Let&rsquo;s move together
          </h2>
          <p className="max-w-xl text-balance text-base text-muted sm:text-lg">
            Get to know being a Market Heister.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button href={`mailto:${CONTACT_EMAIL}`} size="lg">
              Contact Us
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent-strong"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </motion.div>
      </Container>

      <div className="border-t border-border-subtle">
        <Container className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Market Heist. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
