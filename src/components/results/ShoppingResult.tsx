import { Check, X, ExternalLink, Award, ShoppingBag } from "lucide-react";
import type { ShoppingStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function ShoppingResult({ data }: { data: ShoppingStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <Award className="h-3 w-3" /> Recommendation
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.picks.map((p, i) => {
            const isTop = data.recommendation && p.name.toLowerCase().includes(data.recommendation.toLowerCase());
            const buyLinks = p.buy_links?.length ? p.buy_links : (p.url ? [{ label: "View", url: p.url }] : []);
            return (
              <div key={i} className={`rounded-xl border ${isTop ? "border-accent bg-accent/5" : "border-border"} overflow-hidden flex flex-col`}>
                {p.image_url && (
                  <div className="aspect-[16/9] bg-secondary overflow-hidden">
                    <SafeImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" fallbackClassName="w-full h-full" />
                  </div>
                )}
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold leading-tight">{p.name}</h3>
                    {isTop && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground shrink-0">Top pick</span>}
                  </div>
                  {p.price_range && <div className="text-sm text-muted-foreground">{p.price_range}</div>}
                  {p.best_for && <div className="text-xs text-muted-foreground italic">Best for: {p.best_for}</div>}
                  {!!p.pros?.length && (
                    <ul className="space-y-1 pt-1">
                      {p.pros.map((x, j) => <li key={j} className="text-sm flex gap-2"><Check className="h-4 w-4 text-signal shrink-0 mt-0.5" /> {x}</li>)}
                    </ul>
                  )}
                  {!!p.cons?.length && (
                    <ul className="space-y-1">
                      {p.cons.map((x, j) => <li key={j} className="text-sm flex gap-2"><X className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> {x}</li>)}
                    </ul>
                  )}
                  {!!buyLinks.length && (
                    <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                      {buyLinks.slice(0, 4).map((b, j) => (
                        <a key={j} href={b.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:opacity-90 transition">
                          <ShoppingBag className="h-3 w-3" /> {b.label}
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!!data.comparison_table?.length && (
        <div className="overflow-x-auto">
          <h2 className="font-display text-lg mb-2">Comparison</h2>
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Key spec</th>
                <th className="text-left p-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.comparison_table.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2">{r.price ?? "—"}</td>
                  <td className="p-2">{r.key_spec ?? "—"}</td>
                  <td className="p-2">{r.rating ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
