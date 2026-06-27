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
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        <div className="mb-8">
          <SearchBar initial={q} />
        </div>
        {q ? (
          <ResultsStream key={q} query={q} />
        ) : (
          <p className="text-muted-foreground">Type a query above to start.</p>
        )}
      </main>
    </div>
  );
}
