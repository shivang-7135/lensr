import { Sun, Sunset, Moon, Utensils, Bus, Calendar, Wallet, ExternalLink } from "lucide-react";
import type { TripStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

export function TripResult({ data }: { data: TripStructured }) {
  return (
    <div className="space-y-6">
      {data.hero_image_url && (
        <div className="glass overflow-hidden aspect-[21/9] p-0">
          <SafeImage
            src={data.hero_image_url}
            alt={data.destination ?? "Trip"}
            className="w-full h-full object-cover"
            fallbackClassName="w-full h-full"
          />
        </div>
      )}

      {data.tldr && (
        <div className="p-5 glass-strong">
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {data.destination && (
          <span className="px-3 py-1 rounded-full glass-soft">
            <Calendar className="inline h-3 w-3 mr-1" />
            {data.destination}
          </span>
        )}
        {data.best_time_to_visit && (
          <span className="px-3 py-1 rounded-full glass-soft">
            Best time: {data.best_time_to_visit}
          </span>
        )}
        {data.budget_hint && (
          <span className="px-3 py-1 rounded-full glass-soft">
            <Wallet className="inline h-3 w-3 mr-1" />
            {data.budget_hint}
          </span>
        )}
      </div>

      {!!data.days?.length && (
        <div className="space-y-3">
          {data.days.map((d, i) => (
            <div
              key={d.day}
              className="glass glass-hover overflow-hidden fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {d.image_url && (
                <div className="aspect-[21/6] bg-white/5">
                  <SafeImage
                    src={d.image_url}
                    alt={d.theme ?? `Day ${d.day}`}
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">
                    Day {d.day}
                    {d.theme ? ` — ${d.theme}` : ""}
                  </h3>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  {d.morning && (
                    <div>
                      <div className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Sun className="h-3 w-3" /> Morning
                      </div>
                      {d.morning}
                    </div>
                  )}
                  {d.afternoon && (
                    <div>
                      <div className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Sunset className="h-3 w-3" /> Afternoon
                      </div>
                      {d.afternoon}
                    </div>
                  )}
                  {d.evening && (
                    <div>
                      <div className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Moon className="h-3 w-3" /> Evening
                      </div>
                      {d.evening}
                    </div>
                  )}
                </div>
                {(d.food || d.transport_tip) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-white/10">
                    {d.food && (
                      <span className="flex items-center gap-1">
                        <Utensils className="h-3 w-3" /> {d.food}
                      </span>
                    )}
                    {d.transport_tip && (
                      <span className="flex items-center gap-1">
                        <Bus className="h-3 w-3" /> {d.transport_tip}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!data.packing_tips?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Packing tips</h2>
          <div className="flex flex-wrap gap-2">
            {data.packing_tips.map((t, i) => (
              <span key={i} className="px-3 py-1 rounded-full glass-soft text-sm">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!data.related_links?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Plan & book</h2>
          <div className="flex flex-wrap gap-2">
            {data.related_links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition"
              >
                {l.label} <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </div>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
