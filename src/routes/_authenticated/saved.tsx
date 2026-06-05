import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved searches — Lensr" }] }),
  component: SavedPage,
});

type Saved = { id: string; query: string; intent: string; created_at: string };

function SavedPage() {
  const [items, setItems] = useState<Saved[] | null>(null);
  useEffect(() => {
    supabase
      .from("saved_searches")
      .select("id, query, intent, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data ?? []) as Saved[]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <h1 className="display text-4xl font-bold mb-2">Saved searches</h1>
        <p className="text-muted-foreground mb-8">Your past queries and the agent's answers.</p>
        {items === null && <p className="text-muted-foreground">Loading…</p>}
        {items && items.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground mb-4">Nothing saved yet.</p>
            <Link to="/" className="underline decoration-accent underline-offset-4">Run a search →</Link>
          </div>
        )}
        <ul className="space-y-3">
          {items?.map((s) => (
            <li key={s.id}>
              <Link to="/results" search={{ q: s.query }} className="block border border-border rounded-lg p-4 hover:border-foreground/40 transition bg-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium truncate">{s.query}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{s.intent}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(s.created_at).toLocaleString()}</div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
