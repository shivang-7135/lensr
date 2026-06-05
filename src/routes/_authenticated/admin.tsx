import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  listApiKeys,
  upsertApiKey,
  deleteApiKey,
  checkIsAdmin,
} from "@/lib/api-keys.functions";
import { REQUIRED_KEYS, type RequiredKey } from "@/lib/required-keys";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — API keys — Lensr" }] }),
  component: AdminPage,
});

type Key = { name: string; value: string; description: string | null; updated_at: string };

function AdminPage() {
  const list = useServerFn(listApiKeys);
  const upsert = useServerFn(upsertApiKey);
  const del = useServerFn(deleteApiKey);
  const checkAdmin = useServerFn(checkIsAdmin);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const refresh = async () => {
    const res = await list();
    setKeys(res.keys as Key[]);
    setDrafts(Object.fromEntries((res.keys as Key[]).map((k) => [k.name, k.value])));
  };

  useEffect(() => {
    checkAdmin().then((r) => {
      setAllowed(r.isAdmin);
      if (r.isAdmin) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12 text-muted-foreground">
          Checking access…
        </main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
          <h1 className="display text-4xl font-bold mb-2">Admin</h1>
          <p className="text-muted-foreground">
            Your account does not have admin access. Ask a project owner to grant you the{" "}
            <code className="font-mono">admin</code> role in the <code>user_roles</code> table.
          </p>
        </main>
      </div>
    );
  }

  const save = async (name: string, description: string | null) => {
    setSaving(name);
    try {
      await upsert({ data: { name, value: drafts[name] ?? "", description: description ?? undefined } });
      toast.success(`${name} saved`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const remove = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await del({ data: { name } });
      toast.success(`${name} deleted`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const addNew = async () => {
    if (!newName) return;
    try {
      await upsert({ data: { name: newName, value: newValue, description: newDesc || undefined } });
      toast.success(`${newName} added`);
      setNewName(""); setNewValue(""); setNewDesc("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <h1 className="display text-4xl font-bold mb-2">Admin · API keys</h1>
        <p className="text-muted-foreground mb-8">
          Manage backend secrets used by the LangGraph agents. Values are stored in your database
          and protected by admin-only RLS.
        </p>

        <section className="space-y-4">
          {keys?.map((k) => (
            <div key={k.name} className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div>
                  <div className="font-mono text-sm font-semibold">{k.name}</div>
                  {k.description && (
                    <div className="text-xs text-muted-foreground">{k.description}</div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(k.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type={reveal[k.name] ? "text" : "password"}
                  value={drafts[k.name] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [k.name]: e.target.value })}
                  placeholder="(empty)"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReveal({ ...reveal, [k.name]: !reveal[k.name] })}
                >
                  {reveal[k.name] ? "Hide" : "Show"}
                </Button>
                <Button
                  type="button"
                  onClick={() => save(k.name, k.description)}
                  disabled={saving === k.name}
                >
                  {saving === k.name ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => remove(k.name)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="display text-2xl font-bold mb-4">Add new key</h2>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="new-name">Name (UPPER_SNAKE_CASE)</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value.toUpperCase())} placeholder="MY_API_KEY" />
            </div>
            <div>
              <Label htmlFor="new-value">Value</Label>
              <Input id="new-value" type="password" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new-desc">Description (optional)</Label>
              <Input id="new-desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <Button type="button" onClick={addNew} className="w-fit">Add</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
