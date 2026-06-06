import { useState, useEffect } from "react";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import type { StreamEvent } from "@/lib/search/types";
import { AgentTimeline } from "@/components/results/AgentTimeline";

export function ResearchPanel({ events, done }: { events: StreamEvent[]; done: boolean }) {
  const [open, setOpen] = useState(true);

  // Auto-collapse once research is finished
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(t);
    }
  }, [done]);

  const sourcesFound = events
    .filter((e) => e.type === "search_results")
    .reduce((acc, e) => acc + (e.type === "search_results" ? e.count : 0), 0);
  const loops = events.filter((e) => e.type === "reflection").length;

  return (
    <div className="glass overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          {done ? (
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 text-accent shrink-0 animate-spin" />
          )}
          <span className="text-sm font-medium truncate">
            {done ? "Research complete" : "Researching…"}
          </span>
          {sourcesFound > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {sourcesFound} sources{loops > 0 ? ` · ${loops + 1} passes` : ""}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/10">
          <AgentTimeline events={events} done={done} />
        </div>
      )}
    </div>
  );
}
