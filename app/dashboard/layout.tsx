import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, role")
    .eq("id", user.id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("name")
    .eq("id", profile?.plan_id ?? "basic")
    .single();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardNav
        email={user.email ?? ""}
        planName={plan?.name ?? "Market Heister Basic"}
        isAdmin={profile?.role === "admin"}
      />
      <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
