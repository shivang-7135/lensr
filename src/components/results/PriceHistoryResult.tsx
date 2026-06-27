import {
  TrendingDown,
  TrendingUp,
  Minus,
  HelpCircle,
  ArrowDownToLine,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { PriceHistoryStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";

const TREND_ICON = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
  unknown: HelpCircle,
} as const;

export function PriceHistoryResult({ data }: { data: PriceHistoryStructured }) {
  const score =
    typeof data.buy_now_score === "number" ? Math.max(0, Math.min(10, data.buy_now_score)) : null;
  const Trend = TREND_ICON[data.trend ?? "unknown"];
  const currency = data.currency ?? "$";
  const points = (data.price_points ?? []).filter((p) => typeof p.price === "number");
  const minPoint = points.length
    ? points.reduce((min, p) => (p.price < min.price ? p : min))
    : null;
  const lowest =
    data.lowest_price ??
    (minPoint ? { price: minPoint.price, when: minPoint.date, where: minPoint.label } : null);

  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-4 glass glass-hover">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Typical price
          </div>
          <div className="text-lg font-display font-semibold mt-1">
            {data.typical_price_range ?? "—"}
          </div>
        </div>
        <div className="p-4 glass glass-hover">
          <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <Trend className="h-3 w-3" /> Trend
          </div>
          <div className="text-lg font-display font-semibold mt-1 capitalize">
            {data.trend ?? "unknown"}
          </div>
        </div>
        {score !== null && (
          <div className="p-4 glass glass-hover">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Buy now score
            </div>
            <div className="flex items-end gap-2 mt-1">
              <div className="text-2xl font-display font-bold">
                {score}
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
            </div>
            <div className="h-1.5 mt-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-signal"
                style={{ width: `${score * 10}%` }}
              />
            </div>
            {data.buy_now_reason && (
              <div className="text-xs text-muted-foreground mt-1">{data.buy_now_reason}</div>
            )}
          </div>
        )}
      </div>

      {points.length >= 2 && (
        <div className="p-4 glass">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-lg">Price history</h2>
            {lowest && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowDownToLine className="h-3 w-3 text-signal" />
                Lowest:{" "}
                <span className="font-mono font-semibold text-signal">
                  {currency}
                  {lowest.price}
                </span>
                {lowest.when && <span>· {lowest.when}</span>}
                {lowest.where && <span>· {lowest.where}</span>}
              </div>
            )}
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "oklch(0.72 0.02 260)" }}
                  stroke="oklch(1 0 0 / 0.15)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.72 0.02 260)" }}
                  stroke="oklch(1 0 0 / 0.15)"
                  tickFormatter={(v) => `${currency}${v}`}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 270 / 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid oklch(1 0 0 / 0.18)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "oklch(0.97 0.01 250)",
                  }}
                  formatter={(v: number) => [`${currency}${v}`, "Price"]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="oklch(0.74 0.18 248)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "oklch(0.74 0.18 248)" }}
                  activeDot={{ r: 5 }}
                />
                {lowest?.when && (
                  <ReferenceDot
                    x={lowest.when}
                    y={lowest.price}
                    r={6}
                    fill="oklch(0.82 0.18 165)"
                    stroke="oklch(0.14 0.025 270)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!!data.sale_windows?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Sale windows</h2>
          <ul className="space-y-2">
            {data.sale_windows.map((w, i) => (
              <li
                key={i}
                className="p-3 glass glass-hover flex flex-wrap gap-x-4 gap-y-1 items-baseline"
              >
                <div className="font-medium">{w.when}</div>
                <div className="text-sm text-muted-foreground">{w.why}</div>
                {w.expected_drop && (
                  <div className="ml-auto text-sm text-signal font-mono">↓ {w.expected_drop}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!data.related_links?.length && (
        <div className="flex flex-wrap gap-2">
          {data.related_links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition"
            >
              {l.label} <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ))}
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
