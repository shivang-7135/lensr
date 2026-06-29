import { useEffect, useRef, useState } from "react";
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

export function ResultsStream({ query }: { query: string }) {
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
          body: JSON.stringify({ query }),
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
      {/* Animated color splash background during research — skip for cache hits */}
      <ResearchAnimation active={!done && !error && !cached} />

      <div className="mx-auto max-w-3xl w-full space-y-6 fade-up relative z-10">
        {/* Show cache banner OR live research panel */}
        {cached ? <CacheHitBanner query={query} /> : <ResearchPanel events={events} done={done} />}

        <div className="flex items-center gap-3 flex-wrap">
          {intent && (
            <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full glass-soft text-accent font-medium">
              {INTENT_LABEL[intent]}
            </span>
          )}
          <h1 className="font-display text-2xl sm:text-3xl tracking-tight leading-tight">
            {query}
          </h1>
        </div>

        {error && (
          <div className="p-4 glass border border-destructive/50 text-sm text-destructive">
            {error}
          </div>
        )}

        {final && intent ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderStructured(intent, final.structured, final.markdown, final.sources)}
            <div className="pt-6 animate-in fade-in duration-700 delay-500">
              <SourcesGrid sources={final.sources} />
            </div>
          </div>
        ) : partial ? (
          <div className="p-5 glass animate-in fade-in duration-500">
            <div className="text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Drafting answer
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{partial}</p>
          </div>
        ) : !error ? (
          <div className="space-y-3">
            <div className="h-5 w-2/3 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
            <div className="h-40 w-full glass animate-pulse mt-4" />
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div className="h-28 glass animate-pulse" />
              <div className="h-28 glass animate-pulse" />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
