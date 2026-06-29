import { useNavigate } from "@tanstack/react-router";
import { SEARCH_CATEGORIES } from "@/lib/search/categories";

export function CategoryGrid() {
  const navigate = useNavigate();
  return (
    <section className="mt-32 relative">
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-2">Try asking…</h2>
          <p className="text-base text-muted-foreground">
            Twenty things Lensr is good at. Tap one to see it in action.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SEARCH_CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.to) navigate({ to: c.to });
              else navigate({ to: "/results", search: { q: c.example } });
            }}
            className="group text-left p-5 glass glass-hover fade-up relative overflow-hidden"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-3xl transform group-hover:scale-110 transition-transform duration-300 origin-bottom-left">
                {c.emoji}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 font-medium">
                ask →
              </span>
            </div>
            <div className="font-display text-lg font-semibold leading-tight relative z-10 group-hover:text-accent transition-colors">
              {c.label}
            </div>
            <div className="text-sm text-muted-foreground mt-1 relative z-10">{c.hint}</div>
            <div className="text-xs text-foreground/60 mt-3 line-clamp-2 italic relative z-10 bg-black/5 dark:bg-white/5 p-2 rounded-md border border-black/5 dark:border-white/5">
              {c.to ? "Upload a photo →" : `"${c.example}"`}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
