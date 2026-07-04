import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Button from "@/components/ui/Button";
import LogoutButton from "@/components/dashboard/LogoutButton";
import ProfileNameForm from "@/components/dashboard/ProfileNameForm";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import DeleteAccountSection from "@/components/dashboard/DeleteAccountSection";
import LinkTelegramSection from "@/components/dashboard/LinkTelegramSection";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, plan_id, plan_expires_at")
    .eq("id", user.id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", profile?.plan_id ?? "basic")
    .single();

  const isPaid = (plan?.price_monthly ?? 0) > 0;

  const { data: telegramLink } = await supabase
    .from("telegram_links")
    .select("telegram_username")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted">Manage your profile and membership.</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Profile</h2>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted">Email</p>
          <p className="text-sm text-foreground">{profile?.email || user.email}</p>
        </div>
        <ProfileNameForm userId={user.id} initialName={profile?.full_name?.trim() ?? ""} />
        <div className="border-t border-border-subtle pt-4 md:hidden">
          <LogoutButton />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Password</h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Telegram</h2>
        <LinkTelegramSection linked={!!telegramLink} telegramUsername={telegramLink?.telegram_username ?? null} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Membership</h2>
          <Button href="/dashboard/billing" size="md">
            {isPaid ? "Extend / upgrade" : "Upgrade"}
          </Button>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">{plan?.name ?? "Market Heister Basic"}</p>
            {isPaid && profile?.plan_expires_at ? (
              <p className="text-sm text-muted">Active until {fmtDate(profile.plan_expires_at)} UTC</p>
            ) : (
              <p className="text-sm text-muted">Free plan</p>
            )}
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(plan?.features ?? []).map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Not sure which plan fits? See{" "}
          <Link href="/#pricing" className="text-accent-strong hover:underline">
            pricing
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Danger zone</h2>
        <DeleteAccountSection />
      </section>
    </div>
  );
}
