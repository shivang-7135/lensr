import { useState } from "react";
import {
  Search,
  Brain,
  Globe,
  FileText,
  RefreshCw,
  Sparkles,
  Eye,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { StreamEvent } from "@/lib/search/types";

const STAGE_META: Record<string, { icon: typeof Search; label: string; color: string }> = {
  extract_keywords: { icon: Brain, label: "Extracting keywords", color: "text-violet-400" },
  plan: { icon: Sparkles, label: "Planning search queries", color: "text-accent" },
  vision: { icon: Eye, label: "Analyzing image", color: "text-blue-400" },
  synthesize: { icon: Sparkles, label: "Synthesizing answer", color: "text-accent" },
};

export function AgentTimeline({ events, done }: { events: StreamEvent[]; done: boolean }) {
  const [expandedQueries, setExpandedQueries] = useState(false);

  const items = events.filter((e) =>
    [
      "stage",
      "keywords_extracted",
      "search_plan",
      "search_results",
      "scrape_progress",
      "reflection",
      "vision_result",
    ].includes(e.type),
  );

  const totalSources = events
    .filter((e) => e.type === "search_results")
    .reduce((a, e) => a + (e.type === "search_results" ? e.count : 0), 0);

  if (!items.length) {
    return (
      <ol className="space-y-2.5 text-sm">
        <li className="flex items-center gap-2 animate-pulse text-muted-foreground font-sans text-xs pl-7 relative">
          <div className="absolute left-[calc(0.5rem-3px)] top-1.5 h-1.5 w-1.5 rounded-full bg-accent/60" />
          Planning research…
        </li>
      </ol>
    );
  }

  const renderIndicator = (isCompleted: boolean, isActive: boolean) => {
    if (isActive) {
      return (
        <div className="absolute left-[calc(0.5rem-4px)] top-1.5 flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
        </div>
      );
    }
    if (isCompleted) {
      return (
        <div className="absolute left-[calc(0.5rem-5px)] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_8px_oklch(0.62_0.16_165/0.4)]">
          <CheckCircle2 className="h-2 w-2 text-emerald-400" />
        </div>
      );
    }
    return (
      <div className="absolute left-[calc(0.5rem-3px)] top-1.5 h-1.5 w-1.5 rounded-full bg-white/20 border border-white/10" />
    );
  };

  return (
    <ol className="space-y-4 text-sm timeline-line">
      {items.map((e, i) => {
        const isLast = i === items.length - 1;
        const isCompleted = done || !isLast;
        const isActive = !done && isLast;

        /* ── Stage marker ── */
        if (e.type === "stage") {
          const isSearch = e.stage.startsWith("search_loop");
          const meta = STAGE_META[e.stage];
          const Icon = meta?.icon ?? (isSearch ? Search : Globe);
          const label =
            meta?.label ?? (isSearch ? `Search pass ${e.stage.split("_").pop()}` : e.stage);
          const color = meta?.color ?? (isSearch ? "text-sky-400" : "text-muted-foreground");
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced font-medium"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="flex items-center gap-2 py-0.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="text-xs font-sans font-semibold tracking-wide text-foreground/90 uppercase">{label}</span>
              </div>
            </li>
          );
        }

        /* ── Keywords ── */
        if (e.type === "keywords_extracted") {
          const kws = [...(e.keywords.keywords ?? []), ...(e.keywords.entities ?? [])];
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="glass-soft rounded-lg p-3 border border-white/5 space-y-2">
                {e.keywords.intent_summary && (
                  <p className="text-xs italic text-muted-foreground leading-relaxed font-sans">
                    {e.keywords.intent_summary}
                  </p>
                )}
                {kws.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {kws.map((k) => (
                      <span
                        key={k}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 border border-accent/20 font-sans font-medium"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        }

        /* ── Search plan ── */
        if (e.type === "search_plan") {
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="glass-soft rounded-lg p-3 border border-white/5">
                <button
                  onClick={() => setExpandedQueries((v) => !v)}
                  className="flex items-center justify-between w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground transition font-sans"
                >
                  <span className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{e.queries.length} search queries planned</span>
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${expandedQueries ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedQueries && (
                  <ul className="mt-2 space-y-1 pl-2 border-l border-white/10 ml-1 font-sans">
                    {e.queries.map((q, qi) => (
                      <li
                        key={qi}
                        className="text-[11px] text-muted-foreground flex items-start gap-1.5 py-0.5"
                      >
                        <span className="text-accent/50 font-mono shrink-0">{qi + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        }

        /* ── Search results ── */
        if (e.type === "search_results") {
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="flex items-center gap-2 text-xs py-0.5 font-sans font-medium text-sky-400">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Found <span className="font-semibold">{e.count}</span> sources
                  {e.loop > 1 && <span className="text-muted-foreground"> (pass {e.loop})</span>}
                </span>
              </div>
            </li>
          );
        }

        /* ── Scrape progress ── */
        if (e.type === "scrape_progress") {
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="flex items-center gap-2 text-xs py-0.5 text-muted-foreground font-sans">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>Reading {e.count} pages…</span>
              </div>
            </li>
          );
        }

        /* ── Reflection ── */
        if (e.type === "reflection") {
          const sufficient = e.done;
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="glass-soft rounded-lg p-3 border border-white/5 space-y-1">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold font-sans ${sufficient ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {sufficient ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  )}
                  <span>{sufficient ? "Sufficient evidence gathered" : "Reflection: Need more data"}</span>
                </div>
                {!sufficient && e.missing && (
                  <p className="text-[11px] text-muted-foreground italic font-sans pl-5 leading-relaxed">
                    {e.missing}
                  </p>
                )}
              </div>
            </li>
          );
        }

        /* ── Vision result ── */
        if (e.type === "vision_result") {
          return (
            <li
              key={i}
              className="relative pl-7 fade-up-enhanced"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {renderIndicator(isCompleted, isActive)}
              <div className="glass-soft rounded-lg p-3 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 font-sans">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Scene detected</span>
                </div>
                {e.scene.scene && (
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed pl-5">{e.scene.scene}</p>
                )}
              </div>
            </li>
          );
        }

        return null;
      })}

      {done && totalSources > 0 && (
        <li
          className="relative pl-7 flex items-center gap-2 text-xs text-emerald-400 font-semibold mt-2 pt-3 border-t border-white/10 fade-up-enhanced"
          style={{ animationDelay: `${items.length * 100}ms` }}
        >
          <div className="absolute left-[calc(0.5rem-6px)] top-3 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_12px_oklch(0.62_0.16_165/0.5)]">
            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="font-sans">Research complete · {totalSources} sources analyzed</span>
        </li>
      )}
      {!done && (
        <li className="relative pl-7 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <div className="absolute left-[calc(0.5rem-3px)] top-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
          <span className="font-sans">Working…</span>
        </li>
      )}
    </ol>
  );
}
