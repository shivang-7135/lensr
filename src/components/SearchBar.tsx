import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

const INTENT_CHIPS = [
  { label: "Buy a phone", q: "best phone under $700 for photography" },
  { label: "Plan a trip", q: "5-day trip to Lisbon in October" },
  { label: "Price history", q: "price history of Sony WH-1000XM5" },
  { label: "Insta caption", q: "/insta" },
];

export function SearchBar({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/results", search: { q: q.trim() } });
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} className="relative">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything — shopping, trips, prices, captions…"
          className="w-full bg-card border-2 border-foreground/90 rounded-xl px-6 py-5 text-lg outline-none focus:border-accent shadow-[6px_6px_0_0_var(--color-foreground)] transition-shadow focus:shadow-[8px_8px_0_0_var(--color-accent)]"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-foreground text-background px-5 py-2.5 rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Search →
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mt-4">
        {INTENT_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              if (c.q.startsWith("/")) navigate({ to: c.q });
              else { setQ(c.q); navigate({ to: "/results", search: { q: c.q } }); }
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary hover:border-foreground/40 transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
