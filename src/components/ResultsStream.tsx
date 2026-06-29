import { useEffect, useRef, useState } from "react";
import { Clock, Zap } from "lucide-react";
import type { StreamEvent, SearchIntent, StructuredResult } from "@/lib/search/types";
import { ResearchPanel, CacheHitBanner } from "@/components/results/ResearchPanel";
import { ResearchAnimation } from "@/components/results/ResearchAnimation";
import { SourcesGrid } from "@/components/results/SourcesGrid";
import { GeneralResult } from "@/components/results/GeneralResult";
import { ShoppingResult } from "@/components/results/ShoppingResult";
import { TripResult } from "@/components/results/TripResult";
import { PriceHistoryResult } from "@/components/results/PriceHistoryResult";
import { InstaResult } from "@/components/results/InstaResult";
import { MoviesResult } from "@/components/results/MoviesResult";
import { RecipesResult } from "@/components/results/RecipesResult";
import { BooksResult } from "@/components/results/BooksResult";
import { PlacesResult } from "@/components/results/PlacesResult";
import { EventsResult } from "@/components/results/EventsResult";

const INTENT_LABEL: Record<SearchIntent, string> = {
  shopping: "Shopping",
  price_history: "Price History",
  trip: "Trip Planner",
  insta: "Instagram",
  movies: "Movies & TV",
  recipes: "Recipes",
  books: "Books",
  places: "Places",
  events: "Events",
  tech: "Tech",
  health: "Health",
  finance: "Finance",
  news: "News",
  sports: "Sports",
  howto: "How-To",
  learning: "Learning",
  jobs: "Jobs & Careers",
  local: "Local Services",
  comparison: "Comparison",
  gift: "Gift Ideas",
  legal: "Legal Info",
  gaming: "Gaming",
  diy: "DIY",
  fitness: "Fitness",
  pets: "Pets",
  music: "Music",
  productivity: "Productivity",
  weather: "Weather",
  real_estate: "Real Estate",
  automotive: "Automotive",
  food: "Food & Dining",
  fashion: "Fashion",
  parenting: "Parenting",
  dating: "Dating",
  general: "General",
};

type Sources = { title: string; url: string }[];

function hasArr(d: Record<string, unknown> | null, key: string): boolean {
  return !!d && Array.isArray(d[key]) && (d[key] as unknown[]).length > 0;
}

function isUsable(intent: SearchIntent, d: Record<string, unknown> | null): boolean {
  if (!d) return false;
  switch (intent) {
    case "shopping":
      return hasArr(d, "picks");
    case "trip":
      return hasArr(d, "days");
    case "insta":
      return hasArr(d, "captions");
    case "movies":
      return hasArr(d, "picks");
    case "recipes":
      return hasArr(d, "picks");
    case "books":
      return hasArr(d, "picks");
    case "places":
      return hasArr(d, "picks");
    case "events":
      return hasArr(d, "picks");
    case "price_history":
      return d.typical_price_range != null || d.buy_now_score != null;
    // New intents - they use GeneralResult with tldr/key_facts/detail_markdown
    case "tech":
    case "health":
    case "finance":
    case "news":
    case "sports":
    case "howto":
    case "learning":
    case "jobs":
    case "local":
    case "comparison":
    case "gift":
    case "legal":
    case "gaming":
    case "diy":
    case "fitness":
    case "pets":
    case "music":
    case "productivity":
    case "weather":
    case "real_estate":
    case "automotive":
    case "food":
    case "fashion":
    case "parenting":
    case "dating":
    case "general":
      return !!(
        d.tldr ||
        d.detail_markdown ||
        hasArr(d, "key_facts") ||
        hasArr(d, "key_points") ||
        hasArr(d, "tips") ||
        hasArr(d, "picks")
      );
    default:
      return false;
  }
}

function firstParagraph(s: string): string {
  const p = s?.split(/\n\s*\n/)[0]?.trim() ?? "";
  return p.length > 280 ? p.slice(0, 277) + "…" : p;
}

function renderStructured(
  intent: SearchIntent,
  data: Record<string, unknown> | null,
  fallbackMarkdown: string,
  sources: Sources,
) {
  // Degrade to General whenever the intent-specific card can't be filled
  if (!isUsable(intent, data)) {
    const general = {
      intent: "general" as const,
      tldr: (data?.tldr as string) || firstParagraph(fallbackMarkdown) || "Here's what I found.",
      key_facts: Array.isArray(data?.key_facts) ? (data!.key_facts as string[]) : [],
      detail_markdown:
        fallbackMarkdown ||
        (typeof data?.detail_markdown === "string" ? (data!.detail_markdown as string) : ""),
    };
    return <GeneralResult data={general} sources={sources} />;
  }

  const withIntent = { intent, ...data } as unknown as StructuredResult;
  switch (intent) {
    case "shopping":
      return (
        <ShoppingResult data={withIntent as Extract<StructuredResult, { intent: "shopping" }>} />
      );
    case "trip":
      return <TripResult data={withIntent as Extract<StructuredResult, { intent: "trip" }>} />;
    case "price_history":
      return (
        <PriceHistoryResult
          data={withIntent as Extract<StructuredResult, { intent: "price_history" }>}
        />
      );
    case "insta":
      return <InstaResult data={withIntent as Extract<StructuredResult, { intent: "insta" }>} />;
    case "movies":
      return <MoviesResult data={withIntent as Extract<StructuredResult, { intent: "movies" }>} />;
    case "recipes":
      return (
        <RecipesResult data={withIntent as Extract<StructuredResult, { intent: "recipes" }>} />
      );
    case "books":
      return <BooksResult data={withIntent as Extract<StructuredResult, { intent: "books" }>} />;
    case "places":
      return <PlacesResult data={withIntent as Extract<StructuredResult, { intent: "places" }>} />;
    case "events":
      return <EventsResult data={withIntent as Extract<StructuredResult, { intent: "events" }>} />;
    default:
      return (
        <GeneralResult
          data={withIntent as Extract<StructuredResult, { intent: "general" }>}
          sources={sources}
        />
      );
  }
}

// Client-side timeout for the stream (90 seconds)
const STREAM_TIMEOUT_MS = 90_000;

export function ResultsStream({ query, fastMode = false }: { query: string; fastMode?: boolean }) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partial, setPartial] = useState("");
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const [final, setFinal] = useState<{
    structured: Record<string, unknown> | null;
    markdown: string;
    sources: { title: string; url: string }[];
  } | null>(null);
  const [done, setDone] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Elapsed time tracking
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    setFinalElapsed(null);
  }, [query, fastMode]);

  useEffect(() => {
    if (done || error) {
      setFinalElapsed(Date.now() - startTimeRef.current);
      return;
    }
    const id = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 100);
    return () => clearInterval(id);
  }, [done, error]);

  useEffect(() => {
    setEvents([]);
    setPartial("");
    setIntent(null);
    setFinal(null);
    setDone(false);
    setCached(false);
    setError(null);
    const ctl = new AbortController();
    abortRef.current = ctl;
    let aborted = false;

    // Timeout: abort if stream takes too long
    const timeout = setTimeout(() => {
      if (!aborted) {
        ctl.abort();
        setError("Search timed out. Please try a simpler query.");
        setDone(true);
      }
    }, STREAM_TIMEOUT_MS);

    function processLine(line: string) {
      if (!line.startsWith("data: ")) return;
      try {
        const ev = JSON.parse(line.slice(6)) as StreamEvent;
        setEvents((prev) => [...prev, ev]);
        if (ev.type === "intent_detected") setIntent(ev.intent);
        if (ev.type === "cache_hit") setCached(true);
        if (ev.type === "partial_answer") {
          // Each partial_answer replaces the previous one (fast preview → real tldr)
          setPartial(ev.delta);
        }
        if (ev.type === "final") {
          setIntent(ev.intent);
          setFinal({
            structured: (ev.structured as Record<string, unknown>) ?? null,
            markdown: ev.markdown ?? "",
            sources: ev.sources ?? [],
          });
          setDone(true);
        }
        if (ev.type === "error") setError(ev.message ?? "An error occurred");
      } catch {
        // Malformed JSON event — skip silently
      }
    }

    (async () => {
      try {
        const resp = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, fast_mode: fastMode }),
          signal: ctl.signal,
        });
        if (!resp.ok || !resp.body) {
          setError(`Request failed (${resp.status})`);
          setDone(true);
          return;
        }
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
              processLine(line);
            }
          }
        }
        // Flush remaining buffer after stream ends
        if (buf.trim()) {
          for (const line of buf.split("\n")) {
            processLine(line);
          }
        }
        setDone(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message ?? "Connection lost");
        }
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      aborted = true;
      clearTimeout(timeout);
      ctl.abort();
    };
  }, [query]);

  return (
    <>
      <ResearchAnimation active={!done && !error && !cached} />

      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto w-full relative z-10">
        {/* Left Column: Live Research Sidebar — hidden on mobile during loading to prevent layout shifts */}
        <div className="hidden lg:block w-full lg:w-[320px] shrink-0 order-last lg:order-first">
          <div className="sticky top-24">
            {cached ? <CacheHitBanner query={query} /> : <ResearchPanel events={events} done={done} />}
          </div>
        </div>

        {/* Mobile: Compact status bar — minimal, no animations */}
        <div className="lg:hidden w-full order-first">
          {cached ? (
            <CacheHitBanner query={query} />
          ) : !done && !error ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 dark:bg-[#1a1a1a] mb-3">
              <span className="text-xs text-muted-foreground">Searching…</span>
              <span className="text-xs tabular-nums text-muted-foreground font-mono">
                {(elapsed / 1000).toFixed(1)}s
              </span>
            </div>
          ) : done && finalElapsed && !cached ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-emerald-500/5 mb-3">
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Done</span>
              <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-mono">
                {(finalElapsed / 1000).toFixed(1)}s
              </span>
            </div>
          ) : null}
        </div>

        {/* Right Column: Main Content */}
        <div className="flex-1 min-w-0 flex flex-col pt-1 overflow-hidden">
          <div className="mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
            {intent && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/50 dark:bg-[#1a1a1a] text-muted-foreground font-medium border border-border/40 dark:border-[#2a2a2a]">
                {INTENT_LABEL[intent]}
              </span>
            )}
            {/* Timer — desktop only for live, both for final */}
            {!done && !error && !cached && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-muted/50 dark:bg-[#18181b] text-muted-foreground font-mono tabular-nums border border-border/50 dark:border-[#27272a]">
                <Clock className="h-3 w-3" />
                {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
            {done && finalElapsed && !cached && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {(finalElapsed / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <h1 className="font-sans text-xl sm:text-4xl tracking-tight font-semibold text-foreground dark:text-[#fafafa] mb-4 sm:mb-8 break-words">
            {query}
          </h1>

        {error && (
          <div className="p-4 glass border border-destructive/50 text-sm text-destructive">
            {error}
          </div>
        )}

        {final && intent ? (
          <div className="space-y-6 sm:space-y-8">
            {renderStructured(intent, final.structured, final.markdown, final.sources)}
            <div className="pt-6 sm:pt-8 border-t border-border dark:border-[#27272a]">
              <SourcesGrid sources={final.sources} />
            </div>
          </div>
        ) : partial ? (
          <div className="flex flex-col">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Drafting…</p>
            
            <div className="relative max-h-48 sm:max-h-96 overflow-hidden">
              <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/80 dark:text-[#d4d4d8] font-sans">
                {partial}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
            
            <div className="mt-4 sm:mt-8 space-y-2.5 opacity-50">
              <div className="h-3 sm:h-4 w-full bg-muted dark:bg-[#222] rounded" />
              <div className="h-3 sm:h-4 w-[85%] bg-muted dark:bg-[#222] rounded" />
              <div className="h-3 sm:h-4 w-[70%] bg-muted dark:bg-[#222] rounded" />
            </div>
          </div>
        ) : !error ? (
          <div className="flex flex-col mt-2 space-y-3">
            <p className="text-xs text-muted-foreground">Loading…</p>
            <div className="space-y-2.5">
              <div className="h-5 w-40 bg-muted dark:bg-[#222] rounded" />
              <div className="h-3 w-full bg-muted dark:bg-[#222] rounded" />
              <div className="h-3 w-[90%] bg-muted dark:bg-[#222] rounded" />
              <div className="h-3 w-[75%] bg-muted dark:bg-[#222] rounded" />
            </div>
          </div>
        ) : null}

        {(() => {
          const followups = events.filter(e => e.type === 'reflection').flatMap(e => (e as any).followup_queries ?? []).slice(0, 3);
          return done && final && followups.length > 0 ? (
            <div className="pt-8 sm:pt-12 mt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-3">Related</p>
              <div className="flex flex-wrap gap-2">
                {followups.map((q: string, i: number) => (
                  <a
                    key={i}
                    href={`/results?q=${encodeURIComponent(q)}`}
                    className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-muted/50 dark:bg-[#1a1a1a] border border-border/50 dark:border-[#27272a] text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
                  >
                    {q}
                  </a>
                ))}
              </div>
            </div>
          ) : null;
        })()}
        </div>
      </div>
    </>
  );
}
