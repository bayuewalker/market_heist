import { createClient } from "@/lib/supabase/server";
import AdminDonationsTable from "@/components/admin/AdminDonationsTable";

export const dynamic = "force-dynamic";

const DONATION_LIMIT = 200;

export default async function AdminDonationsPage() {
  const supabase = await createClient();

  const { data: donations } = await supabase
    .from("donation_ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(DONATION_LIMIT);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Donation Ledger</h1>
        <p className="text-sm text-muted">
          Entries added here appear publicly on the /donation-ledger transparency page.
        </p>
      </header>

      <AdminDonationsTable donations={donations ?? []} />
    </div>
  );
}
