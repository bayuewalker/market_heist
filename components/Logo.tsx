type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#logo-gradient)" />
        <rect x="1" y="1" width="30" height="30" rx="9" stroke="#2fe28a" strokeOpacity="0.5" />
        <path
          d="M8 21.5L13 13.5L17.5 18.5L24 8.5"
          stroke="#06120d"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M19.5 8.5H24V13" stroke="#06120d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="logo-gradient" x1="1" y1="1" x2="31" y2="31" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5cffb0" />
            <stop offset="1" stopColor="#1f9e63" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Market <span className="text-accent-strong">Heist</span>
      </span>
    </span>
  );
}
