import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

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
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything — shopping, trips, prices, captions…"
          className="glass-input w-full rounded-2xl pl-14 pr-32 py-5 text-lg text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl glass-strong text-foreground font-medium hover:border-accent/60 hover:text-accent transition"
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
              else {
                setQ(c.q);
                navigate({ to: "/results", search: { q: c.q } });
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full glass-soft hover:border-accent/50 hover:text-accent transition-colors"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
