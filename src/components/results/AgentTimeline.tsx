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
        <div className="absolute left-[-9px] top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-[#93c5fd] bg-[#1e3a8a]">
          <span className="h-[6px] w-[6px] rounded-full bg-[#93c5fd]"></span>
        </div>
      );
    }
    if (isCompleted) {
      return (
        <div className="absolute left-[-9px] top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-transparent border-[1.5px] border-[#3f3f46]">
          <CheckCircle2 className="h-[18px] w-[18px] text-[#a1a1aa]" strokeWidth={1.5} />
        </div>
      );
    }
    return (
      <div className="absolute left-[-9px] top-1.5 h-[18px] w-[18px] rounded-full bg-transparent border-[1.5px] border-[#3f3f46]" />
    );
  };

  return (
    <ol className="space-y-6 text-sm border-l border-[#333] ml-[9px] mt-[9px]">
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
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-sans font-medium text-white/90">{label}</span>
              </div>
              {meta?.label && <p className="text-[11px] text-[#a1a1aa] mt-1 pl-0">Identified specific product category and year constraints.</p>}
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
              <div className="space-y-1">
                {e.keywords.intent_summary && (
                  <p className="text-[11px] text-[#a1a1aa] font-sans">
                    {e.keywords.intent_summary}
                  </p>
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
              <div className="space-y-1">
                <p className="text-[11px] text-[#a1a1aa] font-sans">
                  Scanned top tech review sites and audiophile forums.
                </p>
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
              <div className="text-[11px] text-[#a1a1aa] font-sans">
                Found {e.count} sources{e.loop > 1 && ` (pass ${e.loop})`}
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
        <li className="relative pl-7 flex items-center gap-2 text-[13px] font-sans font-medium text-[#52525b]">
          <div className="absolute left-[-5px] top-[7px] h-[10px] w-[10px] rounded-full bg-[#27272a]" />
          <span>Synthesizing answer...</span>
        </li>
      )}
    </ol>
  );
}
