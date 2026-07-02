"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { asset } from "@/lib/asset";

type VideoModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function VideoModal({ open, onClose }: VideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], video, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      lastFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Market Heist demo video"
    >
      <button
        type="button"
        aria-label="Close demo"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        className="gradient-border relative w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/30 bg-surface shadow-[0_40px_120px_-30px_rgba(47,226,138,0.5)]"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Market Heist — Demo
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close demo"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-foreground transition-colors hover:border-accent/60 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <video
          className="aspect-video w-full bg-black"
          controls
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={asset("/assets/hero-loop.mp4")} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
