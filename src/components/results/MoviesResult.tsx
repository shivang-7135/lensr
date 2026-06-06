import { Star, Play, Tv2, Clock, Award } from "lucide-react";
import type { MoviesStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function MoviesResult({ data }: { data: MoviesStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <Award className="h-3 w-3" /> What to watch
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.picks.map((m, i) => {
            const isTop = data.recommendation && m.title.toLowerCase().includes(data.recommendation.toLowerCase());
            return (
              <article
                key={i}
                className={`group glass glass-hover overflow-hidden flex flex-col fade-up ${isTop ? "ring-1 ring-accent/50" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-[2/3] bg-white/5 overflow-hidden">
                  <SafeImage
                    src={m.poster_url}
                    alt={`${m.title} poster`}
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                    zoomable
                  />
                  {m.rating && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full glass-strong">
                      <Star className="h-3 w-3 text-accent fill-accent" /> {m.rating}
                    </span>
                  )}
                  {isTop && (
                    <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      Top pick
                    </span>
                  )}
                  {m.trailer_url && (
                    <a
                      href={m.trailer_url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Watch trailer"
                    >
                      <span className="h-14 w-14 rounded-full glass-strong inline-flex items-center justify-center">
                        <Play className="h-6 w-6 text-foreground fill-foreground" />
                      </span>
                    </a>
                  )}
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-display font-semibold leading-tight">
                      {m.title}
                      {m.year && <span className="text-muted-foreground font-normal text-sm ml-1">({m.year})</span>}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {m.genre && <span>{m.genre}</span>}
                      {m.runtime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {m.runtime}
                        </span>
                      )}
                      {m.where_to_watch && (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <Tv2 className="h-3 w-3" /> {m.where_to_watch}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.why_recommended && (
                    <p className="text-sm leading-relaxed">{m.why_recommended}</p>
                  )}
                  {m.synopsis && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-auto">{m.synopsis}</p>
                  )}
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
