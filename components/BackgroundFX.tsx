import { asset } from "@/lib/asset";

/**
 * Ambient futuristic background for the hero: a muted, looping H.264 video
 * layer, dark gradient wash, animated grid, and blurred accent orbs. Purely
 * decorative — hidden from assistive tech and non-interactive.
 */
export default function BackgroundFX() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <video
        className="absolute left-1/2 top-0 h-full w-full max-w-none -translate-x-1/2 object-cover opacity-[0.28] mix-blend-screen"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src={asset("/assets/hero-loop.mp4")} type="video/mp4" />
      </video>

      {/* Darkening + readability washes over the video */}
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/30 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_-5%,rgba(47,226,138,0.20),transparent)]" />

      {/* Animated grid */}
      <div className="bg-grid-fine absolute inset-0 opacity-60" />

      {/* Blurred accent orbs */}
      <div className="animate-pulse-glow absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/25 blur-[100px]" />
      <div className="animate-floaty-slow absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-accent-dark/40 blur-[100px]" />
    </div>
  );
}
