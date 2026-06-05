import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchBar } from "@/components/SearchBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lensr — search that thinks" },
      { name: "description", content: "Intent-aware search. Compare products, plan trips, track prices, write captions — powered by LangGraph agents." },
      { property: "og:title", content: "Lensr — search that thinks" },
      { property: "og:description", content: "Intent-aware search. Compare products, plan trips, track prices, write captions." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 relative">
        <div className="absolute inset-0 grid-overlay opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 pt-24 pb-32">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">An intent-aware search engine</p>
          <h1 className="display text-5xl sm:text-7xl font-bold leading-[0.95] mb-6">
            Don't search. <br />
            <span className="text-accent">Ask.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl">
            Lensr routes your query to a specialized agent — shopping, trip planning, price history, or caption help —
            and returns one opinionated answer instead of ten blue links.
          </p>
          <SearchBar />

          <div className="mt-20 grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-2 border-foreground/90 rounded-xl p-5 bg-card shadow-[4px_4px_0_0_var(--color-foreground)]">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <h3 className="font-display text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built with TanStack Start · LangGraph · AWS Bedrock
      </footer>
    </div>
  );
}

const FEATURES = [
  { emoji: "🛒", title: "Shopping agent", body: "Compares top picks with pros, cons and a clear recommendation." },
  { emoji: "📈", title: "Price history", body: "Tracks product prices and estimates the best window to buy." },
  { emoji: "✈️", title: "Trip planner", body: "Day-by-day itinerary with transport and budget hints." },
  { emoji: "📸", title: "Insta helper", body: "Upload a photo — get caption styles and place ideas." },
];
