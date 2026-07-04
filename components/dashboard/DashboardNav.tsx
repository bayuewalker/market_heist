"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Coins,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Menu,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "./LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/broker", label: "Broker Station", icon: Landmark },
  { href: "/dashboard/missions", label: "Missions", icon: Trophy },
  { href: "/dashboard/rewards", label: "Rewards", icon: Coins },
  { href: "/dashboard/signals", label: "Signals", icon: Radar },
  { href: "/dashboard/request", label: "Request signal", icon: Sparkles },
  { href: "/dashboard/trends", label: "Trends", icon: TrendingUp },
  { href: "/dashboard/mentoring", label: "Mentoring", icon: CalendarClock },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/account", label: "Account", icon: UserRound },
];

export default function DashboardNav({
  email,
  planName,
  isAdmin,
}: {
  email: string;
  planName: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className="flex shrink-0 flex-col border-b border-border-subtle bg-surface/60 md:h-screen md:w-64 md:gap-6 md:border-b-0 md:border-r md:p-4">
      <div className="flex items-center justify-between p-4 md:p-0">
        <Link href="/" aria-label="Market Heist home">
          <Logo />
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="dashboard-nav-list"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      <nav
        id="dashboard-nav-list"
        aria-label="Dashboard"
        className={`${open ? "flex" : "hidden"} flex-col gap-1 border-t border-border-subtle px-4 pb-4 md:flex md:border-t-0 md:px-0 md:pb-0`}
      >
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/15 text-accent-strong ring-1 ring-inset ring-accent/25"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/10"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin panel
          </Link>
        )}
      </nav>

      <div className="mt-auto hidden flex-col gap-3 border-t border-border-subtle pt-4 md:flex">
        <div className="px-3">
          <p className="truncate text-sm font-medium text-foreground">{email}</p>
          <p className="text-xs text-muted">{planName}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
