import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SignalCard from "@/components/dashboard/SignalCard";
import Button from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your signals</h1>
          <p className="text-sm text-muted">Every signal Mentor Heister has generated for you.</p>
        </div>
        <Button href="/dashboard/request">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          New signal
        </Button>
      </header>

      {signals && signals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
          <p className="font-medium text-foreground">No signals yet</p>
          <p className="mt-1 text-sm text-muted">
            Head to{" "}
            <Link href="/dashboard/request" className="text-accent-strong hover:underline">
              Request signal
            </Link>{" "}
            to get started.
          </p>
        </div>
      )}
    </div>
  );
}
