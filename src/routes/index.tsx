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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-transparent blur-3xl rounded-full mix-blend-screen" />
      </div>
      <div className="absolute top-40 -left-40 w-96 h-96 bg-signal/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute top-60 -right-40 w-96 h-96 bg-accent/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

      <SiteHeader />
      <main className="flex-1 relative z-10">
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-32">
          <div className="max-w-3xl relative">
            <div className="absolute -left-8 -top-8 w-24 h-24 bg-accent/20 blur-2xl rounded-full pointer-events-none" />
            <p className="text-sm uppercase tracking-[0.25em] text-accent/80 mb-4 fade-up font-medium">
              An intent-aware search engine
            </p>
            <h1
              className="display text-6xl sm:text-8xl font-bold leading-[0.95] mb-6 fade-up tracking-tight"
              style={{ animationDelay: "60ms" }}
            >
              Don't search. <br />
              <span className="bg-gradient-to-r from-accent via-[oklch(0.68_0.18_290)] to-[oklch(0.62_0.18_165)] bg-clip-text text-transparent relative inline-block">
                Ask.
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-accent to-transparent rounded-full opacity-50" />
              </span>
            </h1>
            <p
              className="text-xl text-muted-foreground mb-10 max-w-xl fade-up leading-relaxed"
              style={{ animationDelay: "120ms" }}
            >
              Lensr routes your query to a specialized agent — shopping, trip planning, price
              history, or caption help — and returns{" "}
              <strong className="text-foreground font-medium">one opinionated answer</strong>{" "}
              instead of ten blue links.
            </p>
            <div className="fade-up relative group" style={{ animationDelay: "180ms" }}>
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-signal/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <SearchBar />
            </div>
          </div>

          <CategoryGrid />
        </div>
      </main>
      <footer className="py-8 text-center text-sm text-muted-foreground relative z-10 border-t border-white/5 bg-background/50 backdrop-blur-sm">
        Built with <span className="text-foreground font-medium">TanStack Start</span> ·{" "}
        <span className="text-foreground font-medium">LangGraph</span> ·{" "}
        <span className="text-foreground font-medium">AWS Bedrock</span>
      </footer>
    </div>
  );
}
