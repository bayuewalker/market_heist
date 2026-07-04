"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Coins,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  Menu,
  Radar,
  ShieldCheck,
  Trophy,
  Users,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/broker-accounts", label: "Broker accounts", icon: Landmark },
  { href: "/admin/commissions", label: "Commissions", icon: FileSpreadsheet },
  { href: "/admin/rewards", label: "Rewards", icon: Coins },
  { href: "/admin/missions", label: "Missions", icon: Trophy },
  { href: "/admin/signals", label: "Signals", icon: Radar },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/character", label: "Character", icon: UserRound },
];

export default function AdminNav({ email }: { email: string }) {
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
          aria-controls="admin-nav-list"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      <div className="mx-4 hidden items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-strong md:mx-0 md:flex">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Admin mode
      </div>

      <nav
        id="admin-nav-list"
        aria-label="Admin"
        className={`${open ? "flex" : "hidden"} flex-col gap-1 border-t border-border-subtle px-4 pb-4 md:flex md:border-t-0 md:px-0 md:pb-0`}
      >
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="mt-1 inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
      </nav>

      <div className="mt-auto hidden flex-col gap-3 border-t border-border-subtle pt-4 md:flex">
        <div className="px-3">
          <p className="truncate text-sm font-medium text-foreground">{email}</p>
          <p className="text-xs text-muted">Admin</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
