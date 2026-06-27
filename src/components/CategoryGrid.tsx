import { useNavigate } from "@tanstack/react-router";
import { SEARCH_CATEGORIES } from "@/lib/search/categories";

export function CategoryGrid() {
  const navigate = useNavigate();
  return (
    <section className="mt-20">
      <div className="flex items-end justify-between mb-5 fade-up">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Try asking…</h2>
          <p className="text-sm text-muted-foreground">
            Twenty things Lensr is good at. Tap one to see it in action.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SEARCH_CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.to) navigate({ to: c.to });
              else navigate({ to: "/results", search: { q: c.example } });
            }}
            className="group text-left p-4 glass glass-hover fade-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                ask →
              </span>
            </div>
            <div className="font-display text-base font-semibold leading-tight">{c.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div>
            <div className="text-xs text-foreground/70 mt-2 line-clamp-2 italic">
              {c.to ? "Upload a photo →" : `"${c.example}"`}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
