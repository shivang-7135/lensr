import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchBar } from "@/components/SearchBar";
import { CategoryGrid } from "@/components/CategoryGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lensr — search that thinks" },
      {
        name: "description",
        content:
          "Intent-aware search. Compare products, plan trips, track prices, write captions — powered by LangGraph agents.",
      },
      { property: "og:title", content: "Lensr — search that thinks" },
      {
        property: "og:description",
        content: "Intent-aware search. Compare products, plan trips, track prices, write captions.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 relative">
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-32">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.25em] text-accent/80 mb-4 fade-up">
              An intent-aware search engine
            </p>
            <h1
              className="display text-5xl sm:text-7xl font-bold leading-[0.95] mb-6 fade-up"
              style={{ animationDelay: "60ms" }}
            >
              Don't search. <br />
              <span className="bg-gradient-to-r from-accent via-[oklch(0.68_0.18_290)] to-[oklch(0.62_0.18_165)] bg-clip-text text-transparent">
                Ask.
              </span>
            </h1>
            <p
              className="text-lg text-muted-foreground mb-10 max-w-xl fade-up"
              style={{ animationDelay: "120ms" }}
            >
              Lensr routes your query to a specialized agent — shopping, trip planning, price
              history, or caption help — and returns one opinionated answer instead of ten blue
              links.
            </p>
            <div className="fade-up" style={{ animationDelay: "180ms" }}>
              <SearchBar />
            </div>
          </div>

          <CategoryGrid />
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Built with TanStack Start · LangGraph · AWS Bedrock
      </footer>
    </div>
  );
}
