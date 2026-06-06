import { useState } from "react";
import { Copy, Check, MapPin, Sparkles, ExternalLink } from "lucide-react";
import type { InstaStructured } from "@/lib/search/types";
import { DetailDisclosure } from "./DetailDisclosure";
import { SafeImage } from "./SafeImage";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

export function InstaResult({ data }: { data: InstaStructured }) {
  const allHashtags = (data.hashtags ?? []).join(" ");

  return (
    <div className="space-y-6">
      {data.generated_image_url && (
        <div className="glass overflow-hidden relative p-0">
          <div className="aspect-square sm:aspect-[4/5] max-h-[560px] bg-white/5">
            <SafeImage src={data.generated_image_url} alt={data.scene ?? "Generated"} className="w-full h-full object-cover" fallbackClassName="w-full h-full" zoomable />
          </div>
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full glass-soft">
            <Sparkles className="h-3 w-3 text-accent" /> AI generated
          </div>
        </div>
      )}

      {(data.scene || data.mood) && (
        <div className="p-5 glass-strong">
          {data.scene && <p className="text-base leading-relaxed">{data.scene}</p>}
          {data.mood && <div className="text-xs uppercase tracking-widest text-accent mt-2">Mood: {data.mood}</div>}
        </div>
      )}

      {!!data.captions?.length && (
        <div className="grid md:grid-cols-2 gap-3">
          {data.captions.map((c, i) => (
            <div key={i} className="p-4 glass glass-hover space-y-2 fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-accent font-medium">{c.style}</span>
                <CopyButton text={c.text} />
              </div>
              <p className="text-sm leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {!!data.hashtags?.length && (
        <div className="p-4 glass">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg">Hashtags</h2>
            <CopyButton text={allHashtags} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags.map((h, i) => <span key={i} className="text-sm px-2 py-0.5 rounded-full glass-soft">{h}</span>)}
          </div>
        </div>
      )}

      {!!data.place_suggestions?.length && (
        <div>
          <h2 className="font-display text-lg mb-2">Similar / nearby spots</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {data.place_suggestions.map((p, i) => (
              <li key={i} className="glass glass-hover overflow-hidden flex">
                {p.image_url && (
                  <div className="w-24 shrink-0 bg-white/5">
                    <SafeImage src={p.image_url} alt={p.name} className="w-full h-full object-cover" fallbackClassName="w-full h-full" />
                  </div>
                )}
                <div className="p-3 flex items-start gap-2 flex-1 min-w-0">
                  <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">
                      {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-accent underline-offset-4 hover:underline">{p.name}</a> : p.name}
                    </div>
                    {p.why && <div className="text-xs text-muted-foreground">{p.why}</div>}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium px-2.5 py-1 rounded-full glass-soft hover:border-accent/60 hover:text-accent transition">
                        Open in Maps <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DetailDisclosure markdown={data.detail_markdown} />
    </div>
  );
}
