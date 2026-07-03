"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Radar, ShieldCheck, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/signals", label: "Signals", icon: Radar },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-6 border-b border-border-subtle bg-surface/60 p-4 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <Link href="/" aria-label="Market Heist home" className="hidden md:block">
        <Logo />
      </Link>

      <div className="hidden items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-strong md:flex">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Admin mode
      </div>

      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          className="mt-1 inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
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
