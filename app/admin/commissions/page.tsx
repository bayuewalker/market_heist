import { createClient } from "@/lib/supabase/server";
import CommissionUploadForm from "@/components/admin/CommissionUploadForm";

export const dynamic = "force-dynamic";

const IMPORT_LIMIT = 50;

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AdminCommissionsPage() {
  const supabase = await createClient();

  const [{ data: brokers }, { data: imports }] = await Promise.all([
    supabase.from("brokers").select("*").order("sort", { ascending: true }),
    supabase
      .from("commission_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(IMPORT_LIMIT),
  ]);

  const nameByBroker = new Map((brokers ?? []).map((b) => [b.id, b.name]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Commission imports</h1>
        <p className="text-sm text-muted">
          Upload a broker&apos;s commission CSV, preview the match against verified UIDs, then commit
          to create reward ledger entries.
        </p>
      </header>

      <CommissionUploadForm brokers={brokers ?? []} />

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface p-2">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-3 font-medium">Broker</th>
              <th className="px-2 py-3 font-medium">Period</th>
              <th className="px-2 py-3 font-medium">Rows</th>
              <th className="px-2 py-3 font-medium">Imported</th>
            </tr>
          </thead>
          <tbody>
            {(imports ?? []).map((imp) => (
              <tr key={imp.id} className="border-b border-border-subtle text-sm last:border-0">
                <td className="px-2 py-3 font-medium text-foreground">
                  {nameByBroker.get(imp.broker_id) ?? imp.broker_id}
                </td>
                <td className="px-2 py-3 text-muted">{imp.period}</td>
                <td className="px-2 py-3 tabular-nums text-foreground">{imp.row_count}</td>
                <td className="px-2 py-3 text-muted">{fmtDate(imp.created_at)}</td>
              </tr>
            ))}
            {(!imports || imports.length === 0) && (
              <tr>
                <td colSpan={4} className="px-2 py-8 text-center text-sm text-muted">
                  No imports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
