import RequestSignalForm from "@/components/dashboard/RequestSignalForm";

export const dynamic = "force-dynamic";

export default function RequestSignalPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Request a signal</h1>
        <p className="text-sm text-muted">
          Ask Mentor Heister for a tactical read on any pair. The AI returns a bias, entry, target,
          stop, and rationale using the FIBOLUTION technique.
        </p>
      </header>
      <RequestSignalForm />
    </div>
  );
}
