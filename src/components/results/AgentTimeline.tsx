import { useState } from "react";
import { Search, Brain, Globe, FileText, RefreshCw, Sparkles, Eye, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import type { StreamEvent } from "@/lib/search/types";

const STAGE_META: Record<string, { icon: typeof Search; label: string; color: string }> = {
  extract_keywords: { icon: Brain, label: "Extracting keywords", color: "text-violet-400" },
  plan:             { icon: Sparkles, label: "Planning search queries", color: "text-accent" },
  vision:           { icon: Eye, label: "Analyzing image", color: "text-blue-400" },
  synthesize:       { icon: Sparkles, label: "Synthesizing answer", color: "text-accent" },
};

export function AgentTimeline({ events, done }: { events: StreamEvent[]; done: boolean }) {
  const [expandedQueries, setExpandedQueries] = useState(false);

  const items = events.filter((e) =>
    ["stage", "keywords_extracted", "search_plan", "search_results", "scrape_progress", "reflection", "vision_result"].includes(e.type),
  );

  const totalSources = events
    .filter((e) => e.type === "search_results")
    .reduce((a, e) => a + (e.type === "search_results" ? e.count : 0), 0);

  if (!items.length) {
    return (
      <ol className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
          Planning research…
        </li>
      </ol>
    );
  }

  return (
    <ol className="space-y-2.5 text-sm">
      {items.map((e, i) => {
        /* ── Stage marker ── */
        if (e.type === "stage") {
          const isSearch = e.stage.startsWith("search_loop");
          const meta = STAGE_META[e.stage];
          const Icon = meta?.icon ?? (isSearch ? Search : Globe);
          const label = meta?.label ?? (isSearch ? `Search pass ${e.stage.split("_").pop()}` : e.stage);
          const color = meta?.color ?? (isSearch ? "text-sky-400" : "text-muted-foreground");
          return (
            <li key={i} className="flex items-center gap-2 font-medium">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <span className="text-xs">{label}</span>
            </li>
          );
        }

        /* ── Keywords ── */
        if (e.type === "keywords_extracted") {
          const kws = [...(e.keywords.keywords ?? []), ...(e.keywords.entities ?? [])];
          return (
            <li key={i} className="ml-5 space-y-1.5">
              {e.keywords.intent_summary && (
                <p className="text-xs italic text-muted-foreground leading-relaxed">{e.keywords.intent_summary}</p>
              )}
              {kws.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {kws.map((k) => (
                    <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 border border-accent/20">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        }

        /* ── Search plan ── */
        if (e.type === "search_plan") {
          return (
            <li key={i} className="ml-5">
              <button
                onClick={() => setExpandedQueries((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <Search className="h-3 w-3" />
                {e.queries.length} search queries planned
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedQueries ? "rotate-180" : ""}`} />
              </button>
              {expandedQueries && (
                <ul className="mt-1.5 space-y-1 pl-1 border-l border-white/10 ml-1">
                  {e.queries.map((q, qi) => (
                    <li key={qi} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-accent/50 font-mono shrink-0">{qi + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        }

        /* ── Search results ── */
        if (e.type === "search_results") {
          return (
            <li key={i} className="ml-5 flex items-center gap-2 text-xs">
              <Globe className="h-3 w-3 text-sky-400 shrink-0" />
              <span>
                Found <span className="font-semibold text-sky-400">{e.count}</span> sources
                {e.loop > 1 && <span className="text-muted-foreground"> (pass {e.loop})</span>}
              </span>
            </li>
          );
        }

        /* ── Scrape progress ── */
        if (e.type === "scrape_progress") {
          return (
            <li key={i} className="ml-5 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              Reading {e.count} pages…
            </li>
          );
        }

        /* ── Reflection ── */
        if (e.type === "reflection") {
          const sufficient = e.done;
          return (
            <li key={i} className="ml-5 space-y-0.5">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${sufficient ? "text-emerald-400" : "text-amber-400"}`}>
                {sufficient
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <AlertCircle className="h-3.5 w-3.5" />}
                {sufficient ? "Sufficient evidence" : "Need more data"}
                {!sufficient && <RefreshCw className="h-3 w-3 ml-0.5" />}
              </div>
              {!sufficient && e.missing && (
                <p className="text-[11px] text-muted-foreground italic pl-5">{e.missing}</p>
              )}
            </li>
          );
        }

        /* ── Vision result ── */
        if (e.type === "vision_result") {
          return (
            <li key={i} className="ml-5 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400">
                <Eye className="h-3.5 w-3.5" /> Scene detected
              </div>
              {e.scene.scene && <p className="text-[11px] text-muted-foreground pl-5">{e.scene.scene}</p>}
            </li>
          );
        }

        return null;
      })}

      {done && totalSources > 0 && (
        <li className="flex items-center gap-2 text-xs text-emerald-400 font-medium mt-1 pt-2 border-t border-white/10">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Done · {totalSources} sources analysed
        </li>
      )}
      {!done && (
        <li className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
          Working…
        </li>
      )}
    </ol>
  );
}
