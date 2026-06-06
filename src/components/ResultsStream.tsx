import { useEffect, useRef, useState } from "react";
import type { StreamEvent, SearchIntent, StructuredResult } from "@/lib/search/types";
import { ResearchPanel } from "@/components/results/ResearchPanel";
import { SourcesGrid } from "@/components/results/SourcesGrid";
import { GeneralResult } from "@/components/results/GeneralResult";
import { ShoppingResult } from "@/components/results/ShoppingResult";
import { TripResult } from "@/components/results/TripResult";
import { PriceHistoryResult } from "@/components/results/PriceHistoryResult";
import { InstaResult } from "@/components/results/InstaResult";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const INTENT_LABEL: Record<SearchIntent, string> = {
  shopping: "Shopping",
  price_history: "Price history",
  trip: "Trip planner",
  insta: "Instagram",
  general: "General",
};

function renderStructured(intent: SearchIntent, data: Record<string, unknown> | null, fallbackMarkdown: string) {
  if (!data) {
    return (
      <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fallbackMarkdown}</ReactMarkdown>
      </article>
    );
  }
  const withIntent = { intent, ...data } as unknown as StructuredResult;
  switch (intent) {
    case "shopping": return <ShoppingResult data={withIntent as Extract<StructuredResult, { intent: "shopping" }>} />;
    case "trip": return <TripResult data={withIntent as Extract<StructuredResult, { intent: "trip" }>} />;
    case "price_history": return <PriceHistoryResult data={withIntent as Extract<StructuredResult, { intent: "price_history" }>} />;
    case "insta": return <InstaResult data={withIntent as Extract<StructuredResult, { intent: "insta" }>} />;
    default: return <GeneralResult data={withIntent as Extract<StructuredResult, { intent: "general" }>} />;
  }
}

export function ResultsStream({ query }: { query: string }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partial, setPartial] = useState("");
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [final, setFinal] = useState<{ structured: Record<string, unknown> | null; markdown: string; sources: { title: string; url: string }[] } | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setEvents([]); setPartial(""); setIntent(null); setFinal(null); setDone(false); setError(null);
    const ctl = new AbortController();
    abortRef.current = ctl;

    (async () => {
      try {
        const resp = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: ctl.signal,
        });
        if (!resp.ok || !resp.body) { setError(`Request failed (${resp.status})`); return; }
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done: rd, value } = await reader.read();
          if (rd) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                const ev = JSON.parse(line.slice(6)) as StreamEvent;
                setEvents((prev) => [...prev, ev]);
                if (ev.type === "intent_detected") setIntent(ev.intent);
                if (ev.type === "partial_answer") setPartial((p) => p + ev.delta);
                if (ev.type === "final") {
                  setIntent(ev.intent);
                  setFinal({
                    structured: (ev.structured as Record<string, unknown>) ?? null,
                    markdown: ev.markdown ?? "",
                    sources: ev.sources ?? [],
                  });
                  setDone(true);
                }
                if (ev.type === "error") setError(ev.message);
              } catch { /* ignore */ }
            }
          }
        }
        setDone(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    })();

    return () => ctl.abort();
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl w-full space-y-6">
      <ResearchPanel events={events} done={done} />

      <div className="flex items-center gap-3">
        {intent && (
          <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-accent/15 text-accent font-medium">
            {INTENT_LABEL[intent]}
          </span>
        )}
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight">
          {query}
        </h1>
      </div>

      {error && (
        <div className="p-4 border border-destructive/40 bg-destructive/10 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {final && intent ? (
        <>
          {renderStructured(intent, final.structured, final.markdown)}
          <div className="pt-6">
            <SourcesGrid sources={final.sources} />
          </div>
        </>
      ) : partial ? (
        <div className="p-5 rounded-xl bg-accent/5 border border-accent/20">
          <div className="text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Drafting answer
          </div>
          <p className="text-base leading-relaxed whitespace-pre-wrap">{partial}</p>
        </div>
      ) : !error ? (
        <div className="space-y-3">
          <div className="h-5 w-2/3 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-secondary rounded animate-pulse" />
          <div className="h-40 w-full bg-secondary/60 rounded-xl animate-pulse mt-4" />
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <div className="h-28 bg-secondary/60 rounded-xl animate-pulse" />
            <div className="h-28 bg-secondary/60 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
