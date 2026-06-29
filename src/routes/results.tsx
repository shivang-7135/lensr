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
  const [fastMode, setFastMode] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        <div className="mb-6">
          <SearchBar initial={q} />
        </div>

        {q && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 p-4 rounded-xl border border-border dark:border-white/5 bg-card/30 dark:bg-[#161616]/30 backdrop-blur-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground dark:text-white/90">Search Engine Speed</span>
              <span className="text-xs text-muted-foreground">Toggle between fast parallel search (~8s) and deep multi-loop research</span>
            </div>
            <div className="flex bg-muted/40 dark:bg-[#18181b]/50 p-1 rounded-full border border-border/50 dark:border-white/5 shadow-inner self-start sm:self-auto">
              <button
                onClick={() => setFastMode(true)}
                className={`text-xs px-4 py-1.5 rounded-full transition-all duration-300 font-medium ${
                  fastMode
                    ? "bg-[#27272a] text-[#f4f4f5] dark:bg-[#e4e4e7] dark:text-[#09090b] shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fast Mode
              </button>
              <button
                onClick={() => setFastMode(false)}
                className={`text-xs px-4 py-1.5 rounded-full transition-all duration-300 font-medium ${
                  !fastMode
                    ? "bg-[#27272a] text-[#f4f4f5] dark:bg-[#e4e4e7] dark:text-[#09090b] shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Deep Mode
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
