import { Star, MapPin, Clock, ExternalLink, Award, Utensils } from "lucide-react";
import type { PlacesStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function PlacesResult({ data }: { data: PlacesStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 glass-strong">
          <div className="text-xs uppercase tracking-widest text-accent mb-1 flex items-center gap-1">
            <Utensils className="h-3 w-3" /> Where to go
          </div>
          <p className="text-base leading-relaxed">{data.tldr}</p>
          {data.recommendation && (
            <div className="mt-2 text-sm font-semibold">Top pick: {data.recommendation}</div>
          )}
        </div>
      )}

      {!!data.picks?.length && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.picks.map((p, i) => {
            const isTop =
              data.recommendation &&
              p.name.toLowerCase().includes(data.recommendation.toLowerCase());
            return (
              <article
                key={i}
                className={`group glass glass-hover overflow-hidden flex flex-col fade-up ${isTop ? "ring-1 ring-accent/50" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative aspect-[16/10] bg-white/5 overflow-hidden">
                  <SafeImage
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                    zoomable
                  />
                  {p.rating && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full glass-strong">
                      <Star className="h-3 w-3 text-accent fill-accent" /> {p.rating}
                    </span>
                  )}
                  {p.price_level && (
                    <span className="absolute bottom-2 right-2 text-xs font-semibold px-2 py-1 rounded-full glass-strong">
                      {p.price_level}
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
                      {p.maps_url ? (
                        <a
                          href={p.maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-accent transition-colors inline-flex items-center gap-1"
                        >
                          {p.name} <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        p.name
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {p.category && <span>{p.category}</span>}
                      {p.neighborhood && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {p.neighborhood}
                        </span>
                      )}
                      {p.hours && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {p.hours}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.why_recommended && (
                    <p className="text-sm leading-relaxed">{p.why_recommended}</p>
                  )}
                  {!!p.must_try?.length && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        Must try
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.must_try.slice(0, 6).map((m, k) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full glass-soft">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto flex gap-2 pt-2">
                    {p.maps_url && (
                      <a
                        href={p.maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-full glass-strong glass-hover hover:bg-accent hover:text-accent-foreground transition"
                      >
                        <MapPin className="h-3 w-3" /> Open in Maps
                      </a>
                    )}
                    {p.website_url && (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-full glass-soft glass-hover transition"
                      >
                        Website
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
