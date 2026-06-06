import { Sun, Sunset, Moon, Utensils, Bus, Calendar, Wallet } from "lucide-react";
import type { TripStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";

export function TripResult({ data }: { data: TripStructured }) {
  return (
    <div className="space-y-6">
      {data.tldr && (
        <div className="p-5 rounded-xl bg-accent/10 border border-accent/30">
          <p className="text-base leading-relaxed">{data.tldr}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {data.destination && <span className="px-3 py-1 rounded-full bg-secondary"><Calendar className="inline h-3 w-3 mr-1" />{data.destination}</span>}
        {data.best_time_to_visit && <span className="px-3 py-1 rounded-full bg-secondary">Best time: {data.best_time_to_visit}</span>}
        {data.budget_hint && <span className="px-3 py-1 rounded-full bg-secondary"><Wallet className="inline h-3 w-3 mr-1" />{data.budget_hint}</span>}
      </div>

      {!!data.days?.length && (
        <div className="space-y-3">
          {data.days.map((d) => (
            <div key={d.day} className="p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">Day {d.day}{d.theme ? ` — ${d.theme}` : ""}</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                {d.morning && <div><div className="text-xs flex items-center gap-1 text-muted-foreground"><Sun className="h-3 w-3" /> Morning</div>{d.morning}</div>}
                {d.afternoon && <div><div className="text-xs flex items-center gap-1 text-muted-foreground"><Sunset className="h-3 w-3" /> Afternoon</div>{d.afternoon}</div>}
                {d.evening && <div><div className="text-xs flex items-center gap-1 text-muted-foreground"><Moon className="h-3 w-3" /> Evening</div>{d.evening}</div>}
              </div>
              {(d.food || d.transport_tip) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  {d.food && <span className="flex items-center gap-1"><Utensils className="h-3 w-3" /> {d.food}</span>}
                  {d.transport_tip && <span className="flex items-center gap-1"><Bus className="h-3 w-3" /> {d.transport_tip}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!!data.packing_tips?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Packing tips</h2>
          <div className="flex flex-wrap gap-2">
            {data.packing_tips.map((t, i) => <span key={i} className="px-3 py-1 rounded-full bg-secondary text-sm">{t}</span>)}
          </div>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />

    </div>
  );
}
