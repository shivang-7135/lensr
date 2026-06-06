import { Clock, Users, Flame, ChefHat, ExternalLink, Award } from "lucide-react";
import type { RecipesStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function RecipesResult({ data }: { data: RecipesStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <ChefHat className="h-3 w-3" /> What to cook
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.picks.map((r, i) => {
            const isTop = data.recommendation && r.title.toLowerCase().includes(data.recommendation.toLowerCase());
            return (
              <article
                key={i}
                className={`group glass glass-hover overflow-hidden flex flex-col fade-up ${isTop ? "ring-1 ring-accent/50" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
                  <SafeImage src={r.image_url} alt={r.title} className="w-full h-full object-cover" fallbackClassName="w-full h-full" zoomable />
                  {isTop && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      <Award className="h-3 w-3" /> Top pick
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-display font-semibold leading-tight">
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors inline-flex items-center gap-1">
                          {r.title} <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : r.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {r.cuisine && <span>{r.cuisine}</span>}
                      {r.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.time}</span>}
                      {r.servings && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{r.servings}</span>}
                      {r.calories && <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />{r.calories}</span>}
                    </div>
                  </div>
                  {r.why_recommended && <p className="text-sm leading-relaxed">{r.why_recommended}</p>}
                  {!!r.ingredients?.length && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ingredients</div>
                      <div className="flex flex-wrap gap-1">
                        {r.ingredients.slice(0, 8).map((ing, k) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full glass-soft">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-full glass-strong glass-hover hover:bg-accent hover:text-accent-foreground transition">
                      <ChefHat className="h-3.5 w-3.5" /> View full recipe
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
