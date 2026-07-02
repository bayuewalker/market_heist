"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import Button from "./ui/Button";
import Container from "./ui/Container";
import { navLinks } from "@/data/nav";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-300 ${
        scrolled
          ? "border-b border-border-subtle bg-background/80 backdrop-blur-lg"
          : "border-b border-transparent bg-background/40 backdrop-blur-sm"
      }`}
    >
      <Container className="flex items-center justify-between py-3.5">
        <a href="#top" className="shrink-0" aria-label="Market Heist home">
          <Logo />
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden md:block">
          <Button href="#pricing" size="md">
            Access now
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-foreground md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </Container>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border-subtle bg-background/95 backdrop-blur-lg md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            <ul className="flex flex-col">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2 py-3 text-base font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button href="#pricing" size="md" className="mt-2 w-full" onClick={() => setMenuOpen(false)}>
              Access now
            </Button>
          </Container>
        </div>
      )}
    </header>
  );
}
