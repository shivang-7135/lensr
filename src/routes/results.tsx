import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchBar } from "@/components/SearchBar";
import { ResultsStream } from "@/components/ResultsStream";

const searchSchema = z.object({ q: z.string().catch("") });

export const Route = createFileRoute("/results")({
  validateSearch: (s) => searchSchema.parse(s),
  head: ({ match }) => ({
    meta: [
      { title: `${(match.search as { q: string }).q || "Search"} — Lensr` },
      { name: "description", content: "Live agent-powered search results." },
    ],
  }),
  component: ResultsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-destructive font-medium mb-2">Something went wrong.</p>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Link to="/" className="underline">
          Back home
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function ResultsPage() {
  const { q } = Route.useSearch();
  const [fastMode, setFastMode] = useState(true);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-10 overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <SearchBar initial={q} />
        </div>

        {q && (
          <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl border border-border dark:border-white/5 bg-card/30 dark:bg-[#161616]/30 backdrop-blur-sm">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-foreground dark:text-white/90">Speed</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Fast parallel (~8s) vs deep research</span>
            </div>
            <div className="flex bg-muted/40 dark:bg-[#18181b]/50 p-1 rounded-full border border-border/50 dark:border-white/5 shadow-inner shrink-0">
              <button
                onClick={() => setFastMode(true)}
                className={`text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 font-medium ${
                  fastMode
                    ? "bg-[#27272a] text-[#f4f4f5] dark:bg-[#e4e4e7] dark:text-[#09090b] shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fast
              </button>
              <button
                onClick={() => setFastMode(false)}
                className={`text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 font-medium ${
                  !fastMode
                    ? "bg-[#27272a] text-[#f4f4f5] dark:bg-[#e4e4e7] dark:text-[#09090b] shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Deep
              </button>
            </div>
          </div>
        )}

        {q ? (
          <ResultsStream key={`${q}-${fastMode}`} query={q} fastMode={fastMode} />
        ) : (
          <p className="text-muted-foreground">Type a query above to start.</p>
        )}
      </main>
    </div>
  );
}
