import { Search, Brain, Globe, FileText, RefreshCw, Sparkles, Eye } from "lucide-react";
import type { StreamEvent } from "@/lib/search/types";

const ICONS: Record<string, typeof Search> = {
  extract_keywords: Brain,
  plan: Sparkles,
  vision: Eye,
  synthesize: Sparkles,
};

export function AgentTimeline({ events, done }: { events: StreamEvent[]; done: boolean }) {
  const items = events.filter((e) =>
    ["stage", "keywords_extracted", "search_plan", "search_results", "scrape_progress", "reflection", "vision_result"].includes(e.type),
  );

  if (!items.length) {
    return (
      <ol className="space-y-2 text-sm text-muted-foreground">
        <li className="animate-pulse">Planning research…</li>
      </ol>
    );
  }

  return (
    <ol className="space-y-3 text-sm">
      {items.map((e, i) => {
        if (e.type === "stage") {
          const Icon = ICONS[e.stage] ?? (e.stage.startsWith("search_loop") ? Search : Globe);
          const label =
            e.stage === "extract_keywords" ? "Extracting keywords" :
            e.stage === "plan" ? "Planning search queries" :
            e.stage === "vision" ? "Analyzing image" :
            e.stage === "synthesize" ? "Synthesizing answer" :
            e.stage.startsWith("search_loop") ? `Search pass ${e.stage.split("_").pop()}` :
            e.stage;
          return (
            <li key={i} className="flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 text-accent" /> {label}
            </li>
          );
        }
        if (e.type === "keywords_extracted") {
          const kws = e.keywords.keywords ?? [];
          return (
            <li key={i} className="border-l-2 border-accent pl-3 ml-2 space-y-1">
              <div className="text-xs text-muted-foreground">Keywords</div>
              <div className="flex flex-wrap gap-1">
                {kws.map((k) => <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{k}</span>)}
              </div>
              {e.keywords.intent_summary && (
                <div className="text-xs italic text-muted-foreground">{e.keywords.intent_summary}</div>
              )}
            </li>
          );
        }
        if (e.type === "search_plan") {
          return (
            <li key={i} className="border-l-2 border-accent pl-3 ml-2 space-y-1">
              <div className="text-xs text-muted-foreground">Plan ({e.queries.length} queries)</div>
              <ul className="space-y-0.5">
                {e.queries.map((q) => <li key={q} className="text-xs flex items-start gap-1"><Search className="h-3 w-3 mt-0.5 shrink-0" /> {q}</li>)}
              </ul>
            </li>
          );
        }
        if (e.type === "search_results") {
          return (
            <li key={i} className="border-l-2 border-signal/60 pl-3 ml-2">
              <div className="text-xs"><span className="font-mono text-signal">{e.count}</span> sources found (loop {e.loop})</div>
            </li>
          );
        }
        if (e.type === "scrape_progress") {
          return (
            <li key={i} className="border-l-2 border-signal/60 pl-3 ml-2 text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" /> Reading {e.count} pages
            </li>
          );
        }
        if (e.type === "reflection") {
          return (
            <li key={i} className="border-l-2 border-accent pl-3 ml-2 text-xs">
              <div className="flex items-center gap-1 font-medium">
                <RefreshCw className="h-3 w-3" /> Reflection: {e.done ? "enough evidence" : "needs more"}
              </div>
              {!e.done && e.missing && <div className="text-muted-foreground italic mt-0.5">{e.missing}</div>}
            </li>
          );
        }
        if (e.type === "vision_result") {
          return (
            <li key={i} className="border-l-2 border-accent pl-3 ml-2 text-xs">
              <div className="font-medium flex items-center gap-1"><Eye className="h-3 w-3" /> Scene</div>
              <div className="text-muted-foreground">{e.scene.scene}</div>
            </li>
          );
        }
        return null;
      })}
      {!done && <li className="text-xs text-muted-foreground animate-pulse">Working…</li>}
    </ol>
  );
}
