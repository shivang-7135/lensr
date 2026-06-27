import { Star, BookOpen, ExternalLink, Award, ShoppingCart } from "lucide-react";
import type { BooksStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function BooksResult({ data }: { data: BooksStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> What to read
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.picks.map((b, i) => {
            const isTop =
              data.recommendation &&
              b.title.toLowerCase().includes(data.recommendation.toLowerCase());
            return (
              <article
                key={i}
                className={`group glass glass-hover overflow-hidden flex flex-col fade-up ${isTop ? "ring-1 ring-accent/50" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-[2/3] bg-white/5 overflow-hidden">
                  <SafeImage
                    src={b.cover_url}
                    alt={`${b.title} cover`}
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                    zoomable
                  />
                  {b.rating && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full glass-strong">
                      <Star className="h-3 w-3 text-accent fill-accent" /> {b.rating}
                    </span>
                  )}
                  {isTop && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      <Award className="h-3 w-3" /> Top pick
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-display font-semibold leading-tight">
                      {b.goodreads_url ? (
                        <a
                          href={b.goodreads_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-accent transition-colors inline-flex items-center gap-1"
                        >
                          {b.title} <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        b.title
                      )}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {b.author}
                      {b.year ? ` · ${b.year}` : ""}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {b.genre && <span>{b.genre}</span>}
                      {b.pages && <span>{b.pages} pages</span>}
                    </div>
                  </div>
                  {b.why_recommended && (
                    <p className="text-sm leading-relaxed">{b.why_recommended}</p>
                  )}
                  {b.synopsis && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{b.synopsis}</p>
                  )}
                  <div className="mt-auto flex gap-2 pt-2">
                    {b.buy_url && (
                      <a
                        href={b.buy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-full glass-strong glass-hover hover:bg-accent hover:text-accent-foreground transition"
                      >
                        <ShoppingCart className="h-3 w-3" /> Buy
                      </a>
                    )}
                    {b.goodreads_url && (
                      <a
                        href={b.goodreads_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-full glass-soft glass-hover transition"
                      >
                        Reviews
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
