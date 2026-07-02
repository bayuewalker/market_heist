import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountPlanForm from "@/components/dashboard/AccountPlanForm";
import LogoutButton from "@/components/dashboard/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, plan_id")
    .eq("id", user.id)
    .single();

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("sort", { ascending: true });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted">Manage your profile and membership.</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Profile</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Name</dt>
            <dd className="text-sm text-foreground">{profile?.full_name?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Email</dt>
            <dd className="text-sm text-foreground">{profile?.email || user.email}</dd>
          </div>
        </dl>
        <div className="border-t border-border-subtle pt-4 md:hidden">
          <LogoutButton />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Membership</h2>
        <AccountPlanForm
          userId={user.id}
          currentPlanId={profile?.plan_id ?? "basic"}
          plans={plans ?? []}
        />
      </section>
    </div>
  );
}
