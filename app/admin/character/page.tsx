import { createClient } from "@/lib/supabase/server";
import CharacterConfigForm from "@/components/admin/CharacterConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminCharacterPage() {
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from("character_configs")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Character</h1>
        <p className="text-sm text-muted">
          Edit The Playmaker&apos;s persona — copy, avatar, dashboard note, and signal prefix — without a
          deploy. Only one persona should be marked active at a time.
        </p>
      </header>

      {(configs ?? []).map((config) => (
        <CharacterConfigForm key={config.id} config={config} />
      ))}

      {(!configs || configs.length === 0) && (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/50 p-10 text-center">
          <p className="font-medium text-foreground">No character config yet</p>
          <p className="mt-1 text-sm text-muted">Run migration 0010 to seed The Playmaker.</p>
        </div>
      )}
    </div>
  );
}
