import { Check, X, ExternalLink, Award, ShoppingBag } from "lucide-react";
import type { ShoppingStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function ShoppingResult({ data }: { data: ShoppingStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong border-l-2 border-l-transparent" style={{ borderImage: 'linear-gradient(to bottom, oklch(0.65 0.25 275), oklch(0.65 0.25 310)) 1' }}>
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
            const isTop =
              data.recommendation &&
              p.name.toLowerCase().includes(data.recommendation.toLowerCase());
            const buyLinks = p.buy_links?.length
              ? p.buy_links
              : p.url
                ? [{ label: "View", url: p.url }]
                : [];
            return (
              <div
                key={i}
                className={`glass glass-hover overflow-hidden flex flex-col fade-up-enhanced ${isTop ? "ring-1 ring-accent/40" : ""}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {p.image_url && (
                  <div className="aspect-[16/9] bg-white/5 overflow-hidden">
                    <SafeImage
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      fallbackClassName="w-full h-full"
                      zoomable
                    />
                  </div>
                )}
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold leading-tight">{p.name}</h3>
                    {isTop && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white shrink-0 shadow-[0_0_8px_oklch(0.55_0.25_290/0.3)]">
                        Top pick
                      </span>
                    )}
                    {i === 1 && !isTop && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white shrink-0 shadow-[0_0_8px_oklch(0.65_0.18_165/0.3)]">
                        Best value
                      </span>
                    )}
                  </div>
                  {p.price_range && (
                    <div className="text-sm text-muted-foreground">{p.price_range}</div>
                  )}
                  {p.best_for && (
                    <div className="text-xs text-muted-foreground italic">
                      Best for: {p.best_for}
                    </div>
                  )}
                  {!!p.pros?.length && (
                    <ul className="space-y-1 pt-1">
                      {p.pros.map((x, j) => (
                        <li key={j} className="text-sm flex gap-2">
                          <Check className="h-4 w-4 text-signal shrink-0 mt-0.5" /> {x}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!!p.cons?.length && (
                    <ul className="space-y-1">
                      {p.cons.map((x, j) => (
                        <li key={j} className="text-sm flex gap-2">
                          <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> {x}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!!buyLinks.length && (
                    <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                      {buyLinks.slice(0, 4).map((b, j) => (
                        <a
                          key={j}
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 transition shadow-sm"
                        >
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
        <div className="glass-strong p-4 border-l-2 border-l-transparent" style={{ borderImage: 'linear-gradient(to bottom, oklch(0.65 0.25 275), oklch(0.65 0.25 310)) 1' }}>
          <h2 className="font-display text-lg mb-3">Quick Compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-white/10">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Key spec</th>
                  <th className="text-left p-2">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison_table.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.price ?? "—"}</td>
                    <td className="p-2">{r.key_spec ?? "—"}</td>
                    <td className="p-2">{r.rating ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
