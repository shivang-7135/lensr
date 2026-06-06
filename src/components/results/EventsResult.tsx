import { Calendar, MapPin, Ticket, ExternalLink, Award, Music } from "lucide-react";
import type { EventsStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function EventsResult({ data }: { data: EventsStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <Music className="h-3 w-3" /> What's on
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.picks.map((e, i) => {
            const isTop = data.recommendation && e.title.toLowerCase().includes(data.recommendation.toLowerCase());
            const href = e.tickets_url || e.source_url;
            return (
              <article
                key={i}
                className={`group glass glass-hover overflow-hidden flex flex-col fade-up ${isTop ? "ring-1 ring-accent/50" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                  <SafeImage src={e.image_url} alt={e.title} className="w-full h-full object-cover" fallbackClassName="w-full h-full" zoomable />
                  {e.category && (
                    <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full glass-strong">{e.category}</span>
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
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors inline-flex items-center gap-1">
                          {e.title} <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : e.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {(e.date || e.time) && (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <Calendar className="h-3 w-3" />{[e.date, e.time].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {(e.venue || e.city) && (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[e.venue, e.city].filter(Boolean).join(", ")}</span>
                      )}
                      {e.price && <span>{e.price}</span>}
                    </div>
                  </div>
                  {e.why_recommended && <p className="text-sm leading-relaxed">{e.why_recommended}</p>}
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-full glass-strong glass-hover hover:bg-accent hover:text-accent-foreground transition">
                      <Ticket className="h-3.5 w-3.5" /> {e.tickets_url ? "Get tickets" : "Event details"}
                    </a>
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
