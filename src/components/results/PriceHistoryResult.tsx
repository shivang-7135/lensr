import { TrendingDown, TrendingUp, Minus, HelpCircle } from "lucide-react";
import type { PriceHistoryStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, stable: Minus, unknown: HelpCircle } as const;

export function PriceHistoryResult({ data }: { data: PriceHistoryStructured }) {
  const score = typeof data.buy_now_score === "number" ? Math.max(0, Math.min(10, data.buy_now_score)) : null;
  const Trend = TREND_ICON[data.trend ?? "unknown"];

  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Typical price</div>
          <div className="text-lg font-display font-semibold mt-1">{data.typical_price_range ?? "—"}</div>
        </div>
        <div className="p-4 rounded-xl border border-border">
          <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Trend className="h-3 w-3" /> Trend
          </div>
          <div className="text-lg font-display font-semibold mt-1 capitalize">{data.trend ?? "unknown"}</div>
        </div>
        {score !== null && (
          <div className="p-4 rounded-xl border border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Buy now score</div>
            <div className="flex items-end gap-2 mt-1">
              <div className="text-2xl font-display font-bold">{score}<span className="text-sm text-muted-foreground">/10</span></div>
            </div>
            <div className="h-1.5 mt-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${score * 10}%` }} />
            </div>
            {data.buy_now_reason && <div className="text-xs text-muted-foreground mt-1">{data.buy_now_reason}</div>}
          </div>
        )}
      </div>

      {!!data.sale_windows?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Sale windows</h2>
          <ul className="space-y-2">
            {data.sale_windows.map((w, i) => (
              <li key={i} className="p-3 rounded-lg border border-border flex flex-wrap gap-x-4 gap-y-1 items-baseline">
                <div className="font-medium">{w.when}</div>
                <div className="text-sm text-muted-foreground">{w.why}</div>
                {w.expected_drop && <div className="ml-auto text-sm text-signal font-mono">↓ {w.expected_drop}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />

    </div>
  );
}
